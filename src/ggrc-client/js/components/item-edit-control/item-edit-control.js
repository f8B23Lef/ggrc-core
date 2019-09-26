/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './item-edit-control.stache';
import {notifier} from '../../plugins/utils/notifiers-utils';
import * as businessModels from '../../models/business-models';

export default canComponent.extend({
  tag: 'item-edit-control',
  view: canStache(template),
  leakScope: true,
  viewModel: canMap.extend({
    instance: {},
    editMode: false,
    value: '',
    document: {},
    placeholder: '',
    propName: '',
    isEditIconDenied: false,
    context: {
      value: null,
    },
    setEditMode: function () {
      this.attr('editMode', true);
    },
    save: function () {
      const oldValue = this.attr('value');
      let value = this.attr('context.value');

      this.attr('editMode', false);

      if (typeof value === 'string') {
        value = value.trim();
      }

      if (oldValue === value) {
        return;
      }

      this.updateItem(value);
    },
    cancel: function () {
      const value = this.attr('value');
      this.attr('editMode', false);
      this.attr('context.value', value);
    },
    updateContext: function () {
      const value = this.attr('value');
      this.attr('context.value', value);
    },
    fieldValueChanged: function (args) {
      this.attr('context.value', args.value);
    },
    remove: function (document) {
      this.dispatch({
        type: 'removeItem',
        payload: document,
      });
    },
    async updateItem(value) {
      const document = this.attr('document');
      const model = businessModels[document.type];
      try {
        const object = await model.findOne({id: document.id});
        object[this.attr('propName')] = value;
        await model.update(object.id, object);
        this.attr('value', value);
      } catch (err) {
        notifier('error', 'Unable to update.');
      }
    },
  }),
  events: {
    init: function () {
      this.viewModel.updateContext();
    },
    '{viewModel} value': function () {
      if (!this.viewModel.attr('editMode')) {
        this.viewModel.updateContext();
      }
    },
  },
});
