/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import Questionnaire from '../mixins/questionnaire';
import Stub from '../stub';
import ChangeableExternally from '../mixins/changeable-externally';
import DisableAddComments from '../mixins/disable-add-comments';

export default Cacheable.extend({
  root_object: 'data_asset',
  root_collection: 'data_assets',
  category: 'scope',
  findAll: 'GET /api/data_assets',
  findOne: 'GET /api/data_assets/{id}',
  create: 'POST /api/data_assets',
  update: 'PUT /api/data_assets/{id}',
  destroy: 'DELETE /api/data_assets/{id}',
  mixins: [
    Questionnaire,
    ChangeableExternally,
    DisableAddComments,
  ],
  migrationDate: '02/24/2020',
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {
    context: Stub,
    modified_by: Stub,
  },
  tree_view_options: {
    attr_list: Cacheable.attr_list.concat([
      {attr_title: 'Reference URL', attr_name: 'reference_url'},
      {attr_title: 'Effective Date', attr_name: 'start_date'},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
      {
        attr_title: 'Launch Status',
        attr_name: 'status',
        order: 40,
      }, {
        attr_title: 'Description',
        attr_name: 'description',
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
      }, {
        attr_title: 'Created By',
        attr_name: 'created_by',
        attr_sort_field: 'created_by',
      },
    ]),
  },
  sub_tree_view_options: {
    default_filter: ['Policy'],
  },
  defaults: {
    status: 'Draft',
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
}, {});
