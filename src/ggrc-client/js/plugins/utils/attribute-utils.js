/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {isAllowed} from '../../permission';
import {getCurrentUser} from './user-utils';

export const isAttributeVisible = (attrName, instance) => {
  const attribute = instance.tree_view_options.attr_list.
    find((attr) => attr.attr_name === attrName);

  if (isAllowed('__GGRC_ADMIN__') || (attribute && attribute.common)) {
    return true;
  }
  const isSoxUser = getCurrentUser().isSox;

  if (attribute && isSoxUser && attribute.soxOnly) {
    return true;
  }
  if (attribute && !isSoxUser && !attribute.soxOnly) {
    return true;
  }

  return false;
};
