/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canDefineMap from 'can-define/map/map';
import canComponent from 'can-component';
import canStache from 'can-stache';
import template from './assessments-bulk-complete-container.stache';
import pubSub from '../../../pub-sub';
import {request} from '../../../plugins/utils/request-utils';
import {getFiltersForCompletion} from '../../../plugins/utils/bulk-update-service';
import {buildParam} from '../../../plugins/utils/query-api-utils';
import {isMyAssessments} from '../../../plugins/utils/current-page-utils';
import '../../table/table-view/table-view';
import {confirm} from '../../../plugins/utils/modals';
import {backendGdriveClient} from '../../../plugins/ggrc-gapi-client';
import {ggrcPost} from '../../../plugins/ajax-extensions';
import {notifier} from '../../../plugins/utils/notifiers-utils';
import {trackStatus} from '../../../plugins/utils/background-task-utils';

const COMPLETION_MESSAGES = {
  start: `Completing certifications is in progress.
   Once it is done you will get a notification. 
   You can continue working with the app.`,
  success: 'Certifications are completed successfully.',
  fail: `Failed to complete certifications in bulk. 
   Please refresh the page and start bulk complete again.`,
};

const ViewModel = canDefineMap.extend({
  currentFilter: {
    value: null,
  },
  parentInstance: {
    value: null,
  },
  asmtListRequest: {
    value: null,
  },
  assessmentsList: {
    value: () => [],
  },
  attributesList: {
    value: () => [],
  },
  isLoading: {
    value: false,
  },
  pubSub: {
    value: () => pubSub,
  },
  isAttributeModified: {
    value: false,
  },
  isCompleteButtonEnabled: {
    get() {
      return this.assessmentsCountsToComplete > 0;
    },
  },
  assessmentIdsToComplete: {
    value: () => new Set(),
  },
  assessmentsToSave: {
    value: () => new Map(),
  },
  assessmentsCountsToComplete: {
    value: 0,
  },
  isGridEmpty: {
    value: false,
  },
  buildAsmtListRequest() {
    let relevant = null;
    if (!isMyAssessments()) {
      const parentInstance = this.parentInstance;
      relevant = {
        type: parentInstance.type,
        id: parentInstance.id,
        operation: 'relevant',
      };
    }
    const filter =
      getFiltersForCompletion(this.currentFilter, relevant);
    const param = buildParam('Assessment', {}, relevant, [], filter);
    param.type = 'ids';
    this.asmtListRequest = param;
  },
  async loadItems() {
    this.isLoading = true;
    const {assessments, attributes} =
      await request('/api/bulk_operations/cavs/search',
        [this.asmtListRequest.serialize()]);
    this.assessmentsList = assessments;
    this.attributesList = attributes;
    this.isLoading = false;
  },
  onCompleteClick() {
    confirm({
      modal_title: 'Confirmation',
      modal_description: `Please confirm the bulk completion request 
      for ${this.assessmentsCountsToComplete} highlighted assessment(s).<br>
      Answers to all other assessments will be saved`,
      button_view: '/modals/confirm-cancel-buttons.stache',
      modal_confirm: 'Proceed',
    }, () => this.completeAssessments());
  },
  completeAssessments() {
    backendGdriveClient.withAuth(
      () => ggrcPost(
        '/api/bulk_operations/complete',
        this.buildBulkCompleteRequest()),
      {responseJSON: {message: 'Unable to Authorize'}})
      .then(({id}) => {
        if (id) {
          this.assessmentsCountsToComplete = 0;
          this.trackBackgroundTask(id, COMPLETION_MESSAGES);
          this.cleanUpGridAfterCompletion();
        } else {
          notifier('error', COMPLETION_MESSAGES.fail);
        }
      });
  },
  buildBulkCompleteRequest(isSaveAnswersRequest = false) {
    const attributesListToSave = [];
    this.assessmentsToSave.forEach((value, asmtId) => {
      const {slug, attributes} = value;
      const attributesList = [];
      attributes.forEach((attribute) => {
        let extra = {};
        const {attachments} = attribute;
        if (attachments) {
          const urls = attachments.urls.serialize();
          const files = attachments.files.serialize().map((file) => ({
            title: file.title,
            source_gdrive_id: file.id,
          }));
          const comment = attachments.comment ? {
            description: attachments.comment,
            modified_by: {type: 'Person', id: GGRC.current_user.id},
          } : '';
          extra = {
            urls,
            files,
            comment,
          };
        }
        attributesList.push({
          value: this.getValForCompleteRequest(
            attribute.type,
            attribute.value),
          title: attribute.title,
          type: attribute.type,
          definition_id: asmtId,
          id: attribute.id,
          extra,
        });
      });

      const assessmentAttributes = {
        assessment: {id: asmtId, slug},
        values: attributesList,
      };
      attributesListToSave.push(assessmentAttributes);
    });

    return {
      assessments_ids: isSaveAnswersRequest
        ? []: [...this.assessmentIdsToComplete],
      attributes: attributesListToSave,
    };
  },
  getValForCompleteRequest(type, value) {
    switch (type) {
      case 'checkbox':
        return value ? '1' : '0';
      case 'date':
        return value || '';
      default:
        return value;
    }
  },
  cleanUpGridAfterCompletion() {
    const assessmentsList = this.assessmentsList.filter(
      (item) => !this.assessmentIdsToComplete.has(item.id));

    if (!assessmentsList.length) {
      this.isGridEmpty = true;
      this.attributesList = new Map();
    }

    this.assessmentIdsToComplete = new Set();
    this.assessmentsToSave = new Map();
    this.assessmentsList = assessmentsList;
  },
  trackBackgroundTask(taskId, messages) {
    notifier('progress', messages.start);
    const url = `/api/background_tasks/${taskId}`;
    trackStatus(
      url,
      () => notifier('success', messages.success),
      () => notifier('error', messages.fail));
  },
});

export default canComponent.extend({
  tag: 'assessments-bulk-complete-container',
  view: canStache(template),
  ViewModel,
  events: {
    inserted() {
      this.viewModel.buildAsmtListRequest();
      this.viewModel.loadItems();
    },
    '{pubSub} attributeModified'(pubSub, {assessmentData, attribute}) {
      this.viewModel.isAttributeModified = true;
      const asmtId = assessmentData.asmtId;

      if (assessmentData.isReadyToComplete) {
        this.viewModel.assessmentIdsToComplete.add(asmtId);
      } else {
        this.viewModel.assessmentIdsToComplete.delete(asmtId);
      }

      if (this.viewModel.assessmentsToSave.has(asmtId)) {
        // collect last change for an attribute
        const value = this.viewModel.assessmentsToSave.get(asmtId);
        value.attributes.set(attribute.id, attribute);
        this.viewModel.assessmentsToSave.set(asmtId, value);
      } else {
        // collect the first change for an attribute
        const attributes = new Map();
        attributes.set(attribute.id, attribute);
        this.viewModel.assessmentsToSave.set(asmtId, {
          attributes,
          slug: assessmentData.asmtSlug,
        });
      }
      this.viewModel.assessmentsCountsToComplete =
        this.viewModel.assessmentIdsToComplete.size;
    },
    '{pubSub} assessmentReadyToComplete'(pubSub, {asmtId, asmtSlug}) {
      this.viewModel.assessmentIdsToComplete.add(asmtId);
      this.viewModel.assessmentsCountsToComplete =
        this.viewModel.assessmentIdsToComplete.size;

      if (!this.viewModel.assessmentsToSave.has(asmtId)) {
        this.viewModel.assessmentsToSave.set(asmtId, {
          slug: asmtSlug,
          attributes: new Map(),
        });
      }
    },
  },
});
