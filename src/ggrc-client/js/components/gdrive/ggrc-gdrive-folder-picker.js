/*
 * Copyright (C) 2020 Google Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {ggrcAjax} from '../../plugins/ajax-extensions';
import canStache from 'can-stache';
import canDefineMap from 'can-define/map/map';
import canComponent from 'can-component';
import {
  uploadFiles,
  getGDriveItemId,
  findGDriveItemById,
  GDRIVE_PICKER_ERR_CANCEL,
} from '../../plugins/utils/gdrive-picker-utils';
import template from './templates/ggrc-gdrive-folder-picker.stache';

const ViewModel = canDefineMap.extend({
  readonly: {
    type: 'boolean',
    value: false,
  },
  hideLabel: {
    type: 'boolean',
    value: false,
  },
  shouldUpdateFolder: {
    type: 'boolean',
    value: false,
  },
  canEdit: {
    get() {
      return !this.readonly && !this._folder_change_pending;
    },
  },
  folderId: {
    get() {
      if (this.folder_error && this.folder_error.message) {
        return getGDriveItemId(this.folder_error.message);
      }
    },
  },
  _folder_change_pending: {
    value: false,
  },
  no_detach: {
    value: '',
  },
  deferred: {
    value: '',
  },
  tabindex: {
    value: '',
  },
  placeholder: {
    value: '',
  },
  instance: {
    value: null,
  },
  current_folder: {
    value: null,
  },
  folder_error: {
    value: null,
  },
  /**
   * Helper method for unlinking folder currently linked to the
   * given instance.
   *
   * @return {Object} - a deferred object that is resolved when the instance's
   *   folder has been successfully unlinked from it
   */
  unlinkFolder() {
    const instance = this.instance;
    const backUpFolder = this.current_folder.serialize();

    this._folder_change_pending = true;
    this.current_folder = null;

    return ggrcAjax({
      url: '/api/remove_folder',
      type: 'POST',
      data: {
        object_type: instance.attr('type'),
        object_id: instance.attr('id'),
        folder: instance.attr('folder'),
      },
    }).then(() => {
      this.folder_error = null;
      return instance.refresh();
    }).fail(() => {
      this.current_folder = backUpFolder;
    }).always(() => {
      this._folder_change_pending = false;
    });
  },
  /**
   * Helper method for linking new folder to the given instance
   *
   * @param {String} folderId - GDrive folder id
   * @return {Object} - a deferred object that is resolved when the instance's
   *   folder has been successfully linked to it
   */
  linkFolder(folderId) {
    let instance = this.instance;

    return ggrcAjax({
      url: '/api/add_folder',
      type: 'POST',
      data: {
        object_type: instance.attr('type'),
        object_id: instance.attr('id'),
        folder: folderId,
      },
    }).then(() => {
      return instance.refresh();
    });
  },
  setCurrent(folderId) {
    this._folder_change_pending = true;

    return findGDriveItemById(folderId)
      .always(() => {
        this._folder_change_pending = false;
      })
      .done((gdriveFolder) => {
        this.current_folder = gdriveFolder;
        this.folder_error = null;
      })
      .fail((error) => {
        this.folder_error = error;
      });
  },
  setRevisionFolder() {
    let folderId = this.instance.attr('folder');
    if (folderId) {
      this.setCurrent(folderId);
    }
  },
});

export default canComponent.extend({
  tag: 'ggrc-gdrive-folder-picker',
  view: canStache(template),
  leakScope: true,
  ViewModel,
  events: {
    init() {
      let viewModel = this.viewModel;

      if (!viewModel.readonly) {
        this.element.removeAttr('tabindex');
      }

      viewModel.setRevisionFolder();
    },
    '{viewModel.instance} modelAfterSave'() {
      const folder = this.viewModel.instance.attr('_transient.folder');
      if (folder) {
        this.viewModel.instance.attr('_transient.folder', null);
        this.viewModel.linkFolder(folder.id);
        this.viewModel.shouldUpdateFolder = true;
      }
    },
    '{viewModel.instance} folder'() {
      if (this.viewModel.shouldUpdateFolder) {
        this.viewModel.setRevisionFolder();
        this.viewModel.shouldUpdateFolder = false;
      }
    },
    '{viewModel.instance} change'() {
      if (!this.viewModel.folder_error) {
        return;
      }

      this.viewModel.setRevisionFolder();
    },
    /**
     * Handle a click on the button for detaching an upload folder from
     * a model instance (e.g. an Audit).
     *
     * @return {Object} - Deferred chain.
     */
    'a[data-toggle=gdrive-remover] click'() {
      const viewModel = this.viewModel;
      if (viewModel.deferred) {
        viewModel.instance.attr('folder', null);
        viewModel.current_folder = null;

        return $.when();
      }

      return viewModel.unlinkFolder();
    },
    'a[data-toggle=gdrive-picker] click'(el) {
      uploadFiles({
        parentId: el.data('folder-id'),
        pickFolder: el.data('type') === 'folders',
      }).then((files) => {
        el.trigger('picked', {
          files,
        });
      }).catch((err) => {
        if ( err && err.type === GDRIVE_PICKER_ERR_CANCEL ) {
          el.trigger('rejected');
        }
      });
    },
    'a[data-toggle=gdrive-picker] keyup'(element, event) {
      const ESCAPE_KEY_CODE = 27;
      const escapeKeyWasPressed = event.keyCode === ESCAPE_KEY_CODE;

      if (escapeKeyWasPressed) {
        const $element = $(element);
        event.stopPropagation();
        // unset focus for attach button
        $element.blur();
      }
    },
    /*
      * Handle an event of the user picking a new GDrive upload folder.
      *
      * @param {Object} el - The jQuery-wrapped DOM element on which the event
      *   has been triggered.
      * @param {Object} ev - The event object.
      * @param {Object} data - Additional event data.
      *   @param {Array} data.files - The list of GDrive folders the user picked
      *     in the GDrive folder picker modal.
      */
    '.entry-attachment picked'(el, ev, data) {
      let dfd;
      let files = data.files || [];
      let folderId;
      let viewModel = this.viewModel;

      if (el.data('type') === 'folders' &&
          files.length &&
          files[0].mimeType !== 'application/vnd.google-apps.folder'
      ) {
        $(document.body).trigger('ajax:flash', {
          error: 'ERROR: Something other than a Drive folder was chosen ' +
                 'for a folder slot. Please choose a folder.',
        });
        return;
      }

      viewModel._folder_change_pending = true;

      folderId = files[0].id;
      if (viewModel.deferred) {
        viewModel.instance.attr('folder', folderId);
        dfd = $.when();
      } else {
        dfd = viewModel.linkFolder(folderId);
      }

      dfd.then(viewModel.setCurrent(folderId))
        .then(function () {
          if (viewModel.deferred && viewModel.instance._transient) {
            viewModel.instance.attr('_transient.folder', files[0]);
          }
        });
      return dfd;
    },
  },
});
