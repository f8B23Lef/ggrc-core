/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canMap from 'can-map';
import canComponent from 'can-component';
const roleToLinkMap = {
  Control: {
    Admin: 'owner',
    'Control Operators': 'control_operator',
    'Control Owners': 'control_owner',
    'Principal Assignees': 'principal_assignee',
    'Secondary Assignees': 'secondary_assignee',
    'Other Contacts': 'other_contact',
  },
  Risk: {
    Admin: 'owner',
    'Risk Owners': 'risk_owner',
    'Other Contacts': 'other_contact',
  },
  defaults: {
    Admin: 'owner',
    'Primary Contacts': 'contact',
    'Secondary Contacts': 'secondary_contact',
  },
};

const viewModel = canMap.extend({
  define: {
    linkAttrName: {
      get() {
        const roles = roleToLinkMap[this.attr('modelType')]
          || roleToLinkMap.defaults;
        return roles[this.attr('roleName')];
      },
    },
  },
  modelType: '',
  roleName: '',
});

export default canComponent.extend({
  tag: 'role-attr-names-provider',
  viewModel,
});
