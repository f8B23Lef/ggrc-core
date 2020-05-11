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
import '../assessments-bulk-complete-table/assessments-bulk-complete-table-header/assessments-bulk-complete-table-header';
import '../assessments-bulk-complete-table/assessments-bulk-complete-table-row/assessments-bulk-complete-table-row';
import '../../required-info-modal/required-info-modal';
import {getCustomAttributeType} from '../../../plugins/utils/ca-utils';
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
  assessmentsCountsToComplete: {
    value: 0,
  },
  isGridEmpty: {
    value: false,
  },
  headersData: {
    value: () => [],
  },
  rowsData: {
    value: () => [],
  },
  requiredInfoModal: {
    value: () => ({
      title: '',
      state: {
        open: false,
      },
      content: {
        attribute: null,
        requiredInfo: null,
        commentValue: null,
        urls: [],
        files: [],
      },
    }),
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
        this.buildBulkRequest()),
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
  buildBulkRequest(isSaveAnswersRequest = false) {
    const attributesListToSave = [];
    this.rowsData.forEach(({asmtId, asmtSlug, attributes}) => {
      const attributesList = [];

      attributes.forEach((attribute) => {
        if (attribute.isApplicable && attribute.modified) {
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
            } : {};
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
        }
      });

      const assessmentAttributes = {
        assessment: {id: asmtId, slug: asmtSlug},
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
    const rowsData = this.rowsData.filter(
      (item) => !this.assessmentIdsToComplete.has(item.asmtId));

    if (!rowsData.length) {
      this.isGridEmpty = true;
    }

    this.assessmentIdsToComplete = new Set();
    this.rowsData = rowsData;
  },
  trackBackgroundTask(taskId, messages) {
    notifier('progress', messages.start);
    const url = `/api/background_tasks/${taskId}`;
    trackStatus(
      url,
      () => notifier('success', messages.success),
      () => notifier('error', messages.fail));
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
    this.headersData = this.buildHeadersData();
    this.rowsData = this.buildRowsData();
  },
  buildHeadersData() {
    return this.attributesList.map((attribute) => ({
      title: attribute.title,
      mandatory: attribute.mandatory,
    }));
  },
  buildRowsData() {
    const rowsData = [];

    this.assessmentsList.forEach((assessment) => {
      const assessmentData = {
        asmtId: assessment.id,
        asmtTitle: assessment.title,
        asmtStatus: assessment.status,
        asmtSlug: assessment.slug,
        asmtType: assessment.assessment_type,
        isReadyToComplete: false,
      };
      const attributesData = [];

      this.attributesList.forEach((attribute) => {
        let id = null;
        let value = null;
        let optionsList = [];
        let optionsConfig = new Map();
        let isApplicable = false;
        const type = getCustomAttributeType(attribute.attribute_type);
        const defaultValue = this.prepareAttributeValue(type,
          attribute.default_value);

        const assessmentAttributeData = attribute.values[assessment.id];
        if (assessmentAttributeData) {
          id = assessmentAttributeData.attribute_definition_id;
          value = this.prepareAttributeValue(type,
            assessmentAttributeData.value,
            assessmentAttributeData.attribute_person_id);
          ({optionsList, optionsConfig} = this.prepareMultiChoiceOptions(
            assessmentAttributeData.multi_choice_options,
            assessmentAttributeData.multi_choice_mandatory)
          );
          isApplicable = true;
        }

        attributesData.push({
          id,
          type,
          value,
          defaultValue,
          isApplicable,
          title: attribute.title,
          mandatory: attribute.mandatory,
          multiChoiceOptions: {
            values: optionsList,
            config: optionsConfig,
          },
          attachments: null,
          modified: false,
          validation: {
            mandatory: attribute.mandatory,
            valid: (isApplicable ? !attribute.mandatory : true),
            requiresAttachment: false,
            hasMissingInfo: false,
          },
        });
      });

      rowsData.push({attributes: attributesData, ...assessmentData});
    });

    return rowsData;
  },
  prepareAttributeValue(type, value, personId = null) {
    switch (type) {
      case 'checkbox':
        return value === '1';
      case 'date':
        return value || null;
      case 'dropdown':
        return value || '';
      case 'multiselect':
        return value || '';
      case 'person':
        return personId
          ? [{
            id: personId,
            type: 'Person',
            href: `/api/people/${personId}`,
            context_id: null,
          }]
          : null;
      default:
        return value;
    }
  },
  prepareMultiChoiceOptions(multiChoiceOptions, multiChoiceMandatory) {
    const optionsList = this.convertToArray(multiChoiceOptions);
    const optionsStates = this.convertToArray(multiChoiceMandatory);
    const optionsConfig = optionsStates.reduce((config, state, index) => {
      const optionValue = optionsList[index];
      return config.set(optionValue, Number(state));
    }, new Map());

    return {optionsList, optionsConfig};
  },
  convertToArray(value) {
    return typeof value === 'string' ? value.split(',') : [];
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
    '{pubSub} attributeModified'(pubSub, {assessmentData}) {
      this.viewModel.isAttributeModified = true;

      if (assessmentData.isReadyToComplete) {
        this.viewModel.assessmentIdsToComplete.add(assessmentData.asmtId);
      } else {
        this.viewModel.assessmentIdsToComplete.delete(assessmentData.asmtId);
      }

      this.viewModel.assessmentsCountsToComplete =
        this.viewModel.assessmentIdsToComplete.size;
    },
    '{pubSub} assessmentReadyToComplete'(pubSub, {assessmentId}) {
      this.viewModel.assessmentIdsToComplete.add(assessmentId);
      this.viewModel.assessmentsCountsToComplete =
        this.viewModel.assessmentIdsToComplete.size;
    },
  },
});
