/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './add-tab-button.stache';
import {
  isMyWork,
  isAllObjects,
} from '../../plugins/utils/current-page-utils';
import {isAllowedFor} from '../../permission';
import {shouldBeMappedExternally} from '../../models/mappers/mappings';
import '../questionnaire-mapping-link/questionnaire-mapping-link';

const viewModel = canMap.extend({
  define: {
    isAuditInaccessibleAssessment: {
      get() {
        let audit = this.attr('instance.audit');
        let type = this.attr('instance.type');
        let result = (type === 'Assessment') &&
          !!audit &&
          !isAllowedFor('read', audit);
        return result;
      },
    },
    shouldShow: {
      get() {
        let instance = this.attr('instance');

        return !this.attr('isAuditInaccessibleAssessment')
          && isAllowedFor('update', instance)
          && !instance.attr('archived')
          && !instance.attr('_is_sox_restricted')
          && !isMyWork()
          && !isAllObjects()
          && this.attr('widgetList.length') > 0;
      },
    },
  },
  instance: null,
  widgetList: null,
  addTabTitle: '',
});

export default canComponent.extend({
  tag: 'add-tab-button',
  view: canStache(template),
  leakScope: true,
  viewModel,
  events: {
    // top nav dropdown position
    '.dropdown-toggle click'(el) {
      let $dropdown = this.element.find('.dropdown-menu');
      let leftPos = el.offset().left;
      let winWidth = $(window).width();

      if (winWidth - leftPos < 400) {
        $dropdown.addClass('right-pos');
      } else {
        $dropdown.removeClass('right-pos');
      }
    },
  },
  helpers: {
    shouldCreateObject(instance, modelShortName, options) {
      if (modelShortName() === 'Audit' &&
        instance().type === 'Program') {
        return options.fn(options.contexts);
      }

      return options.inverse(options.contexts);
    },
    isMappableExternally(instance, modelShortName, options) {
      let source = instance().type;
      let destination = modelShortName();
      if (shouldBeMappedExternally(source, destination)) {
        return options.fn(options.contexts);
      }
      return options.inverse(options.contexts);
    },
  },
});
