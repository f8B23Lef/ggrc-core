/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import AccessControlList from '../mixins/access-control-list';
import Reviewable from '../mixins/reviewable';
import ChangeableExternally from '../mixins/changeable-externally';

export default Cacheable.extend({
  root_object: 'regulation',
  root_collection: 'regulations',
  category: 'governance',
  model_plural: 'Regulations',
  table_plural: 'regulations',
  title_plural: 'Regulations',
  model_singular: 'Regulation',
  title_singular: 'Regulation',
  table_singular: 'regulation',
  findAll: 'GET /api/regulations',
  findOne: 'GET /api/regulations/{id}',
  create: 'POST /api/regulations',
  update: 'PUT /api/regulations/{id}',
  destroy: 'DELETE /api/regulations/{id}',
  is_custom_attributable: true,
  isRoleable: true,
  mixins: [
    AccessControlList,
    Reviewable,
    ChangeableExternally,
  ],
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
  sub_tree_view_options: {
    default_filter: ['Requirement'],
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
}, {});
