/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canComponent from 'can-component';
import canDefineMap from 'can-define/map/map';
import canStache from 'can-stache';
import canBatch from 'can-event/batch/batch';
import loFind from 'lodash/find';
import template from './assessments-bulk-complete-table-row.stache';
import pubSub from '../../../../pub-sub';
import {getPlainText} from '../../../../plugins/ggrc-utils';
import {ddValidationValueToMap, getLCAPopupTitle} from '../../../../plugins/utils/ca-utils';

const ViewModel = canDefineMap.extend({seal: false}, {
  rowData: {
    value: () => ({}),
  },
  pubSub: {
    value: () => pubSub,
  },
  requiredInfoModal: {
    value: () => ({}),
  },
  validateAttribute(attribute) {
    if (!attribute.isApplicable) {
      return;
    }

    if (attribute.type === 'dropdown') {
      this.performDropdownValidation(attribute);
    } else {
      this.performDefaultValidation(attribute);
    }
  },
  performDropdownValidation(attribute) {
    const {comment, attachment, url} = this.getRequiredInfoStates(attribute);
    const requiresAttachment = comment || attachment || url;

    canBatch.start();

    const validation = attribute.validation;
    validation.requiresAttachment = requiresAttachment;

    if (requiresAttachment) {
      if (attribute.attachments) {
        this.validateRequiredInfo(attribute);
      } else {
        attribute.attachments = {
          comment: null,
          files: [],
          urls: [],
        };
        validation.valid = false;
        validation.hasMissingInfo = true;
      }
    } else {
      validation.valid = validation.mandatory ? attribute.value !== '' : true;
      validation.hasMissingInfo = false;
    }

    canBatch.stop();
  },
  performDefaultValidation(attribute) {
    let {type, value, validation} = attribute;

    if (!validation.mandatory) {
      return;
    }

    switch (type) {
      case 'text':
        value = getPlainText(value);
        break;
      case 'person':
        value = value && value.length;
        break;
    }

    validation.valid = !!(value);
  },
  getRequiredInfoStates(attribute) {
    const optionBitmask = attribute.multiChoiceOptions.config
      .get(attribute.value);
    return ddValidationValueToMap(optionBitmask);
  },
  checkAssessmentReadinessToComplete() {
    const isReadyToComplete = this.rowData.attributes.every(({validation}) => {
      return validation.valid === true;
    });

    return isReadyToComplete;
  },
  attributeValueChanged(value, index) {
    const attribute = this.rowData.attributes[index];
    attribute.value = value;
    attribute.modified = true;
    this.validateAttribute(attribute);
    this.rowData.isReadyToComplete = this.checkAssessmentReadinessToComplete();

    pubSub.dispatch({
      type: 'attributeModified',
      assessmentData: this.rowData,
    });
  },
  showRequiredInfo(index) {
    const attribute = this.rowData.attributes[index];

    const requiredInfo = this.getRequiredInfoStates(attribute);
    const modalTitle = `Required ${getLCAPopupTitle(requiredInfo)}`;
    const attachments = attribute.attachments;

    canBatch.start();

    this.requiredInfoModal.title = modalTitle;
    this.requiredInfoModal.content = {
      attribute: {
        id: attribute.id,
        title: attribute.title,
        value: attribute.value,
      },
      requiredInfo,
      urls: attachments.urls,
      files: attachments.files,
      comment: attachments.comment,
    };
    this.requiredInfoModal.state.open = true;

    canBatch.stop();
  },
  updateRequiredInfo(attributeId, changes) {
    const attribute = loFind(this.rowData.attributes, (attribute) =>
      attribute.id === attributeId);
    const attachments = attribute.attachments;

    canBatch.start();

    attachments.comment = changes.comment;
    attachments.urls.replace(changes.urls);
    attachments.files.replace(changes.files);
    attribute.modified = true;

    canBatch.stop();

    this.validateRequiredInfo(attribute);
    this.rowData.isReadyToComplete = this.checkAssessmentReadinessToComplete();

    pubSub.dispatch({
      type: 'attributeModified',
      assessmentData: this.rowData,
    });
  },
  validateRequiredInfo(attribute) {
    const {comment, attachment, url} = this.getRequiredInfoStates(attribute);
    const attachments = attribute.attachments;

    const hasValidComment = comment
      ? attachments.comment !== null
      : true;
    const hasValidUrls = url
      ? attachments.urls.length > 0
      : true;
    const hasValidFiles = attachment
      ? attachments.files.length > 0
      : true;

    const hasValidAttachments = (
      hasValidComment
      && hasValidUrls
      && hasValidFiles
    );

    attribute.validation.valid = hasValidAttachments;
    attribute.validation.hasMissingInfo = !hasValidAttachments;
  },
});

export default canComponent.extend({
  tag: 'assessments-bulk-complete-table-row',
  view: canStache(template),
  ViewModel,
  events: {
    init() {
      this.viewModel.rowData.attributes.forEach((attribute) => {
        this.viewModel.validateAttribute(attribute);
      });
      this.viewModel.rowData.isReadyToComplete =
        this.viewModel.checkAssessmentReadinessToComplete();

      if (this.viewModel.rowData.isReadyToComplete) {
        pubSub.dispatch({
          type: 'assessmentReadyToComplete',
          assessmentId: this.viewModel.rowData.asmtId,
        });
      }
    },
    '{pubSub} requiredInfoSave'(pubSub, {attributeId, changes}) {
      const isAttributeInRow = this.viewModel.rowData.attributes.serialize()
        .map((attribute) => attribute.id)
        .includes(attributeId);

      if (isAttributeInRow) {
        this.viewModel.updateRequiredInfo(attributeId, changes);
      }
    },
  },
});
