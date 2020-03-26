/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './assessment-tree-actions.stache';
import {isMyAssessments} from '../../../plugins/utils/current-page-utils';
import {getAsmtCountForCompletion} from '../../../plugins/utils/bulk-update-service';
import pubSub from '../../../pub-sub';

export default canComponent.extend({
  tag: 'assessment-tree-actions',
  view: canStache(template),
  viewModel: canMap.extend({
    showBulkCompletion: false,
    currentFilter: null,
    pubSub: pubSub,
    instance: null,
    parentInstance: null,
    model: null,
    setShowBulkCompletion(currentFilter) {
      let action = () => getAsmtCountForCompletion(currentFilter);
      if (!isMyAssessments()) {
        const parentInstance = this.parentInstance;
        const relevant = {
          type: parentInstance.type,
          id: parentInstance.id,
          operation: 'relevant',
        };
        action = () => getAsmtCountForCompletion(currentFilter, relevant);
      }
      action().then((count) => {
        this.attr('showBulkCompletion', count > 0);
      });
    },
  }),
  events: {
    inserted() {
      this.viewModel.setShowBulkCompletion(
        this.viewModel.attr('currentFilter'));
    },
    '{pubSub} currentFilterUpdated'(scope, {currentFilter}) {
      this.viewModel.setShowBulkCompletion(currentFilter);
    },
  },
});
