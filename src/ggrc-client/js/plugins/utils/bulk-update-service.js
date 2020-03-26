/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import loMap from 'lodash/map';
import {ggrcAjax} from '../ajax-extensions';
import {
  buildParam,
  batchRequests,
} from './query-api-utils';

const toBulkModel = (instances, targetProps) => {
  let state = targetProps.state;
  return loMap(instances, (item) => {
    return {
      id: item.id,
      state: state,
    };
  });
};

export default {
  update: function (model, instances, targetProps) {
    const url = '/api/' + model.table_plural;
    const dfd = $.Deferred();
    instances = toBulkModel(instances, targetProps);

    ggrcAjax({
      url: url,
      method: 'PATCH',
      data: JSON.stringify(instances),
      contentType: 'application/json',
    }).done(function (res) {
      dfd.resolve(res);
    }).fail(function (err) {
      dfd.reject(err);
    });
    return dfd;
  },
};

const requestAssessmentsCount = (
  relevant = null,
  filters,
  permissions = null
) => {
  const param = buildParam('Assessment', {}, relevant, [], filters);
  param.type = 'count';

  if (permissions) {
    param.permissions = permissions;
  }

  return batchRequests(param).then(({Assessment: {count}}) => count);
};

export const getAsmtCountForCompletion = (currentFilter, relevant) => {
  const filters = [{
    expression: {
      left: {
        left: 'assignees',
        op: {
          name: '~',
        },
        right: GGRC.current_user.email,
      },
      op: {
        name: 'AND',
      },
      right: {
        left: {
          left: 'status',
          op: {
            name: 'IN',
          },
          right: [
            'Not Started',
            'In Progress',
            'Rework Needed',
          ],
        },
        op: {
          name: 'AND',
        },
        right: {
          left: {
            left: 'sox_302_enabled',
            op: {
              name: '=',
            },
            right: 'yes',
          },
          op: {
            name: 'AND',
          },
          right: {
            left: 'archived',
            op: {
              name: '=',
            },
            right: 'false',
          },
        },
      },
    },
  }];

  if (currentFilter && currentFilter.filter) {
    currentFilter = currentFilter.serialize();
    filters.push(currentFilter.filter);
  }

  return requestAssessmentsCount(relevant, filters, 'update');
};
