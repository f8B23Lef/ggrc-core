/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import UniqueTitle from '../mixins/unique-title';
import CaUpdate from '../mixins/ca-update';
import BaseNotifications from '../mixins/notifications/base-notifications';
import Stub from '../stub';

export default Cacheable.extend({
  root_object: 'directive',
  root_collection: 'directives',
  category: 'governance',
  // `rootModel` overrides `model.model_singular` when determining polymorphic types
  root_model: 'Directive',
  findAll: '/api/directives',
  findOne: '/api/directives/{id}',
  mixins: [UniqueTitle, CaUpdate, BaseNotifications],
  soxOnlyAttributes: ['test_plan'],
  nonSoxOnlyAttributes: [],
  tree_view_options: {
    attr_list: Cacheable.attr_list.concat([
      {
        attr_title: 'State',
        attr_name: 'status',
        order: 40,
      }, {
        attr_title: 'Review State',
        attr_name: 'review_status',
        order: 80,
      }, {
        attr_title: 'Effective Date',
        attr_name: 'start_date',
        order: 85,
      }, {
        attr_title: 'Reference URL',
        attr_name: 'reference_url',
        order: 90,
      }, {
        attr_title: 'Description',
        attr_name: 'description',
        order: 95,
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
        order: 100,
      }, {
        attr_title: 'Assessment Procedure',
        attr_name: 'test_plan',
        order: 105,
      }, {
        attr_title: 'Last Deprecated Date',
        attr_name: 'end_date',
        order: 110,
      }]),
  },
  attributes: {
    context: Stub,
    modified_by: Stub,
  },
}, {
  define: {
    title: {
      value: '',
      validate: {
        required: true,
        validateUniqueTitle: true,
      },
    },
    _transient_title: {
      value: '',
      validate: {
        validateUniqueTitle: true,
      },
    },
  },
});
