/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canComponent from 'can-component';
import canDefineMap from 'can-define/map/map';
import canStache from 'can-stache';
import canBatch from 'can-event/batch/batch';
import template from './table-view-row.stache';
import {getPlainText} from '../../../plugins/ggrc-utils';
import {ddValidationValueToMap} from '../../../plugins/utils/ca-utils';

const ViewModel = canDefineMap.extend({seal: false}, {
  rowData: {
    value: () => ({}),
  },
  isReadyForCompletion: {
    value: false,
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
      attribute.attachments = {
        comment: null,
        files: [],
        urls: [],
      };
      validation.valid = false;
      validation.hasMissingInfo = true;
    } else {
      attribute.attachments = null;
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
  attributeValueChanged(value, index) {
    const attribute = this.rowData.attributes[index];
    attribute.value = value;
    this.validateAttribute(attribute);
  },
});

export default canComponent.extend({
  tag: 'table-view-row',
  view: canStache(template),
  ViewModel,
  events: {
    init() {
      this.viewModel.rowData.attributes.forEach((attribute) => {
        this.viewModel.validateAttribute(attribute);
      });
    },
  },
});
