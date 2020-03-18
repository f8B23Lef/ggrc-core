/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {isAllowed} from '../../permission';
import * as businessModels from '../../models/business-models';

export const isAttributeVisible = (attrName, modelType) => {
  if (isAllowed('__GGRC_ADMIN__')) {
    return true;
  }

  const model = businessModels[modelType];
  const isSoxUser = GGRC.current_user.email.includes('sox');

  const isNonSoxOnly = model.nonSoxOnlyAttributes
  && model.nonSoxOnlyAttributes.find((el) => el === attrName);

  const isSoxOnly = model.soxOnlyAttributes
    && model.soxOnlyAttributes.find((el) => el === attrName);

  if (!isSoxUser && isSoxOnly) {
    return false;
  }

  if (isSoxUser && isNonSoxOnly) {
    return false;
  }

  return true;
};
