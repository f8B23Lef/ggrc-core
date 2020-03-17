/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import CaUpdate from '../mixins/ca-update';
import Proposable from '../mixins/proposable';
import Reviewable from '../mixins/reviewable';
import RelatedAssessmentsLoader from '../mixins/related-assessments-loader';
import ChangeableExternally from '../mixins/changeable-externally';

export default Cacheable.extend({
  root_object: 'control',
  root_collection: 'controls',
  category: 'governance',
  findAll: 'GET /api/controls',
  findOne: 'GET /api/controls/{id}',
  create: 'POST /api/controls',
  update: 'PUT /api/controls/{id}',
  destroy: 'DELETE /api/controls/{id}',
  mixins: [
    CaUpdate,
    Proposable,
    Reviewable,
    RelatedAssessmentsLoader,
    ChangeableExternally,
  ],
  migrationDate: '03/26/2019',
  is_custom_attributable: true,
  isRoleable: true,
  tree_view_options: {
    attr_list: Cacheable.attr_list.concat([
      {
        attr_title: 'Last Assessment Date',
        attr_name: 'last_assessment_date',
        order: 45, // between State and Primary Contact
        common: true,
      },
      {attr_title: 'Reference URL', attr_name: 'reference_url', common: true},
      {attr_title: 'Effective Date', attr_name: 'start_date', common: true},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date', common: true},
      {
        attr_title: 'State',
        attr_name: 'status',
        order: 40,
        common: true,
      }, {
        attr_title: 'Kind/Nature',
        attr_name: 'kind',
        attr_sort_field: 'kind',
        common: true,
      }, {
        attr_title: 'Fraud Related ',
        attr_name: 'fraud_related',
        soxOnly: false,
      },
      {attr_title: 'Significance', attr_name: 'significance', soxOnly: false},
      {
        attr_title: 'Type/Means',
        attr_name: 'means',
        attr_sort_field: 'means',
        soxOnly: true,
      },
      {
        attr_title: 'Frequency',
        attr_name: 'verify_frequency',
        soxOnly: false,
      },
      {attr_title: 'Assertions', attr_name: 'assertions', soxOnly: false},
      {attr_title: 'Categories', attr_name: 'categories', soxOnly: false},
      {
        attr_title: 'Description',
        attr_name: 'description',
        common: true,
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
        common: true,
      }, {
        attr_title: 'Assessment Procedure',
        attr_name: 'test_plan',
        soxOnly: false,
      }, {
        attr_title: 'Review Status',
        attr_name: 'external_review_status',
        attr_sort_field: 'review_status_display_name',
        order: 80,
        common: true,
      }, {
        attr_title: 'Created By',
        attr_name: 'created_by',
        attr_sort_field: 'created_by',
        common: true,
      }, {
        attr_title: 'Due Date',
        attr_name: 'due_date',
        attr_sort_field: 'due_date',
      }, {
        attr_title: 'Last Owner Reviewed Date',
        attr_name: 'last_submitted_at',
        attr_sort_field: 'last_submitted_at',
        soxOnly: true,
      }, {
        attr_title: 'Last Owner Reviewed By',
        attr_name: 'last_submitted_by',
        attr_sort_field: 'last_submitted_by',
        soxOnly: false,
      }, {
        attr_title: 'Last Compliance Reviewed Date',
        attr_name: 'last_verified_at',
        attr_sort_field: 'last_verified_at',
        soxOnly: false,
      }, {
        attr_title: 'Last Compliance Reviewed By',
        attr_name: 'last_verified_by',
        attr_sort_field: 'last_verified_by',
        soxOnly: true,
      }]),
    display_attr_names: ['title', 'status', 'last_assessment_date',
      'updated_at'],
    show_related_assessments: true,
  },
  sub_tree_view_options: {
    default_filter: ['Objective'],
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
}, {});
