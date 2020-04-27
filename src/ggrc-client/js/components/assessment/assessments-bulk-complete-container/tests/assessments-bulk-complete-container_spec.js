/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canMap from 'can-map';
import canList from 'can-list';
import Component from '../assessments-bulk-complete-container';
import {getComponentVM} from '../../../../../js_specs/spec-helpers';
import * as RequestUtils from '../../../../plugins/utils/request-utils';
import * as BulkUpdateService from '../../../../plugins/utils/bulk-update-service';
import * as CurrentPageUtils from '../../../../plugins/utils/current-page-utils';
import * as QueryApiUtils from '../../../../plugins/utils/query-api-utils';
import * as ModalsUtils from '../../../../plugins/utils/modals';
import {backendGdriveClient} from '../../../../plugins/ggrc-gapi-client';
import * as NotifiersUtils from '../../../../plugins/utils/notifiers-utils';

describe('assessments-bulk-complete-container component', () => {
  let viewModel;
  let filter;
  let param;

  beforeEach(() => {
    viewModel = getComponentVM(Component);
    filter = {id: 1};
    param = {type: 'Assessments'};
    spyOn(BulkUpdateService, 'getFiltersForCompletion')
      .and.returnValue(filter);
  });

  describe('buildAsmtListRequest() method', () => {
    beforeEach(() => {
      viewModel.parentInstance = {
        type: 'Audit',
        id: '1',
      };
    });
    it('sets asmtListRequest on My Assessment page', () => {
      spyOn(CurrentPageUtils, 'isMyAssessments').and.returnValue(true);

      spyOn(QueryApiUtils, 'buildParam')
        .withArgs('Assessment', {}, null, [], filter)
        .and.returnValue(param);
      viewModel.buildAsmtListRequest();
      param.type = 'ids';
      expect(viewModel.asmtListRequest.serialize()).toEqual(param);
    });

    it('sets asmtListRequest on Audit page', () => {
      spyOn(CurrentPageUtils, 'isMyAssessments').and.returnValue(false);

      const relevant = {
        type: viewModel.parentInstance.type,
        id: viewModel.parentInstance.id,
        operation: 'relevant',
      };

      spyOn(QueryApiUtils, 'buildParam')
        .withArgs('Assessment', {}, relevant, [], filter)
        .and.returnValue(param);

      viewModel.buildAsmtListRequest();
      param.type = 'ids';
      expect(viewModel.asmtListRequest.serialize()).toEqual(param);
    });
  });

  describe('loadItems() method', () => {
    beforeEach(() => {
      viewModel.asmtListRequest = new canMap();
    });

    it('sets "isLoading" attr to true before request', () => {
      spyOn(RequestUtils, 'request');
      viewModel.isLoading = false;
      viewModel.loadItems();

      expect(viewModel.isLoading).toBe(true);
    });

    it('calls request() method with specified params', () => {
      spyOn(RequestUtils, 'request');
      viewModel.loadItems();

      expect(RequestUtils.request).toHaveBeenCalledWith(
        '/api/bulk_operations/cavs/search', [{}]
      );
    });

    it('sets assessments and attributes attributes', async () => {
      const response = {
        assessments: [1],
        attributes: [2],
      };
      spyOn(RequestUtils, 'request')
        .and.returnValue(Promise.resolve(response));
      await viewModel.loadItems();

      expect(viewModel.assessmentsList.serialize())
        .toEqual(response.assessments);
      expect(viewModel.attributesList.serialize())
        .toEqual(response.attributes);
    });

    it('sets "isLoading" attr to false after request', async () => {
      viewModel.isLoading = true;
      spyOn(RequestUtils, 'request')
        .and.returnValue(Promise.resolve({}));
      await viewModel.loadItems();

      expect(viewModel.isLoading).toBe(false);
    });
  });

  describe('onCompleteClick() method', () => {
    beforeEach(() => {
      spyOn(ModalsUtils, 'confirm');
    });

    it('calls confirm() method', () => {
      viewModel.onCompleteClick();
      expect(ModalsUtils.confirm).toHaveBeenCalled();
    });
  });

  describe('completeAssessments() method', () => {
    let backendGdriveClientSpy;

    beforeEach(() => {
      backendGdriveClientSpy = spyOn(backendGdriveClient, 'withAuth');
      spyOn(viewModel, 'cleanUpGridAfterCompletion');
      spyOn(viewModel, 'trackBackgroundTask');
      viewModel.assessmentsCountsToComplete = 1;
    });

    it('cleans up grid after successful complete', async () => {
      backendGdriveClientSpy.and.returnValue(Promise.resolve({id: 1}));
      await viewModel.completeAssessments();

      expect(viewModel.assessmentsCountsToComplete).toEqual(0);
      expect(viewModel.cleanUpGridAfterCompletion).toHaveBeenCalled();
    });

    it('notifies about error when complete operation ' +
      'does not return background task id', async () => {
      backendGdriveClientSpy.and.returnValue(Promise.resolve({}));
      spyOn(NotifiersUtils, 'notifier');
      await viewModel.completeAssessments();

      expect(NotifiersUtils.notifier).toHaveBeenCalled();
      expect(viewModel.cleanUpGridAfterCompletion).not.toHaveBeenCalled();
    });
  });

  describe('buildBulkCompleteRequest() method', () => {
    it('returns correct request data for complete', () => {
      const readyToCompleteAsmts = [1, 3];
      viewModel.assessmentIdsToComplete = new Set(readyToCompleteAsmts);
      viewModel.assessmentsToSave = new Map();
      viewModel.assessmentsToSave.set(1, {
        slug: 'ASSESSMENT-1',
        attributes: new Map().set('111', {
          value: '1',
          type: 'text',
          id: '111',
          title: 'Text attribute',
        }),
      });

      viewModel.assessmentsToSave.set(2, {
        slug: 'ASSESSMENT-2',
        attributes: new Map().set('222', {
          value: false,
          type: 'checkbox',
          id: '222',
          title: 'Checkbox attribute',
        }),
      });
      viewModel.assessmentsToSave.set(3, {
        slug: 'ASSESSMENT-3',
        attributes: new Map().set('333', {
          value: '3',
          type: 'dropdown',
          id: '333',
          title: 'Dropdown attribute',
          attachments: {
            urls: new canList(['https://localhost']),
            files: new canList(),
            comment: null,
          },
        }),
      });

      const request = viewModel.buildBulkCompleteRequest();

      expect(request).toEqual({
        assessments_ids: readyToCompleteAsmts,
        attributes: [{
          assessment: {id: 1, slug: 'ASSESSMENT-1'},
          values: [{
            value: '1',
            type: 'text',
            id: '111',
            title: 'Text attribute',
            definition_id: 1,
            extra: {},
          }],
        }, {
          assessment: {id: 2, slug: 'ASSESSMENT-2'},
          values: [{
            value: '0',
            type: 'checkbox',
            id: '222',
            title: 'Checkbox attribute',
            definition_id: 2,
            extra: {},
          }],
        }, {
          assessment: {id: 3, slug: 'ASSESSMENT-3'},
          values: [{
            value: '3',
            type: 'dropdown',
            id: '333',
            title: 'Dropdown attribute',
            definition_id: 3,
            extra: {
              urls: ['https://localhost'],
              files: [],
              comment: {},
            },
          }],
        }],
      });
    });
  });

  describe('cleanUpGridAfterCompletion() method', () => {
    it('cleans up "assessmentsList" from completed assessments ', () => {
      viewModel.assessmentIdsToComplete = new Set([1, 3]);
      viewModel.assessmentsList = [{
        id: 1,
        title: 'asmt 1',
      }, {
        id: 2,
        title: 'asmt 2',
      }, {
        id: 3,
        title: 'asmt 3',
      }];
      viewModel.cleanUpGridAfterCompletion();

      expect(viewModel.assessmentIdsToComplete.size).toEqual(0);
      expect(viewModel.assessmentsToSave.size).toEqual(0);
      expect(viewModel.assessmentsList.length).toEqual(1);
    });

    it('sets "isGridEmpty" to true when all assessments were completed', () => {
      viewModel.assessmentIdsToComplete = new Set([1, 2]);
      viewModel.assessmentsList = [{
        id: 1,
        title: 'asmt 1',
      }, {
        id: 2,
        title: 'asmt 2',
      }];
      viewModel.cleanUpGridAfterCompletion();

      expect(viewModel.isGridEmpty).toBeTruthy();
    });
  });

  describe('events', () => {
    let events;

    beforeAll(() => {
      events = Component.prototype.events;
    });

    describe('inserted() method', () => {
      let handler;

      beforeEach(() => {
        handler = events.inserted.bind({
          element: $('<assessments-bulk-complete-container/>'),
          viewModel,
        });
      });

      it('calls buildAsmtListRequest()', () => {
        spyOn(viewModel, 'buildAsmtListRequest');
        handler();

        expect(viewModel.buildAsmtListRequest).toHaveBeenCalled();
      });

      it('calls loadItems()', () => {
        spyOn(viewModel, 'buildAsmtListRequest');
        spyOn(viewModel, 'loadItems');
        handler();

        expect(viewModel.loadItems).toHaveBeenCalled();
      });
    });

    describe('assessmentReadyToComplete event', () => {
      let event;

      beforeEach(() => {
        const eventName = '{pubSub} assessmentReadyToComplete';
        const fakeComponent = {viewModel};
        event = events[eventName].bind(fakeComponent);
        event({}, {asmtId: 1, asmtSlug: 'ASSESSMENT-1'});
      });

      it('sets assessment to "assessmentIdsToComplete" set', () => {
        expect(viewModel.assessmentIdsToComplete).toContain(1);
      });

      it('sets assessment to "assessmentsToSave" map', () => {
        expect(viewModel.assessmentsToSave.size).toEqual(1);
      });

      it('updates "assessmentsCountsToComplete" attribute', () => {
        expect(viewModel.assessmentsCountsToComplete).toEqual(1);
      });

      it('sets assessment to "assessmentsToSave" map one time', () => {
        event({}, {asmtId: 1, asmtSlug: 'ASSESSMENT-1'});
        expect(viewModel.assessmentsToSave.size).toEqual(1);
      });
    });

    describe('attributeModified event', () => {
      let event;

      beforeEach(() => {
        const eventName = '{pubSub} attributeModified';
        const fakeComponent = {viewModel};
        event = events[eventName].bind(fakeComponent);
      });

      it('sets assessments to "assessmentIdsToComplete" set ' +
       'if asmt is ready to complete', () => {
        event({}, {
          assessmentData: {
            asmtId: 1,
            asmtSlug: 'ASSESSMENT-1',
            isReadyToComplete: true,
          },
          attribute: {
            id: 111,
          },
        });
        expect(viewModel.assessmentIdsToComplete).toContain(1);
      });

      it('does not sets assessments to "assessmentIdsToComplete" set ' +
      'if asmt is not ready to complete', () => {
        event({}, {
          assessmentData: {
            asmtId: 1,
            asmtSlug: 'ASSESSMENT-1',
            isReadyToComplete: false,
          },
          attribute: {
            id: 111,
          },
        });
        expect(viewModel.assessmentIdsToComplete).not.toContain(1);
      });

      it('sets assessment to "assessmentsToSave" map', () => {
        event({}, {
          assessmentData: {
            asmtId: 1,
            asmtSlug: 'ASSESSMENT-1',
            isReadyToComplete: false,
          },
          attribute: {
            id: 111,
          },
        });
        expect(viewModel.assessmentsToSave.size).toEqual(1);
      });

      it('updates existing value in "assessmentsToSave" map', () => {
        event({}, {
          assessmentData: {
            asmtId: 1,
            asmtSlug: 'ASSESSMENT-1',
            isReadyToComplete: false,
          },
          attribute: {
            id: 111,
            value: 'text',
          },
        });
        event({}, {
          assessmentData: {
            asmtId: 1,
            asmtSlug: 'ASSESSMENT-1',
            isReadyToComplete: false,
          },
          attribute: {
            id: 111,
            value: 'text2',
          },
        });
        expect(viewModel.assessmentsToSave.get(1).attributes.get(111)).toEqual({
          id: 111,
          value: 'text2',
        });
      });
    });
  });
});
