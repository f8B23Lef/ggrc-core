/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  getComponentVM,
  spyProp,
} from '../../../../js_specs/spec_helpers';
import Component from '../unmap-dropdown-item';
import * as Mappings from '../../../models/mappers/mappings';
import * as CurrentPageUtils from '../../../plugins/utils/current-page-utils';

describe('unmap-dropdown-item component', function () {
  describe('viewModel scope', function () {
    let viewModel;

    beforeEach(function () {
      viewModel = getComponentVM(Component);
    });

    describe('issueUnmap get() method', function () {
      it('returns true if page_instance.type equals to "Issue" string',
        function () {
          viewModel.attr('page_instance.type', 'Issue');
          expect(viewModel.attr('issueUnmap')).toBe(true);
        });

      it('returns true if instance.type equals to "Issue" string', function () {
        viewModel.attr('instance.type', 'Issue');
        expect(viewModel.attr('issueUnmap')).toBe(true);
      });

      it('returns false if there are no instance.type and page_instance.type',
        function () {
          viewModel.attr('page_instance.type', null);
          viewModel.attr('instance.type', null);
          expect(viewModel.attr('issueUnmap')).toBe(false);
        });
    });

    describe('denyIssueUnmap get() method', function () {
      it('returns true if page_instance.type equals to "Audit" and' +
      'instance.allow_unmap_from_audit is false', function () {
        viewModel.attr('page_instance.type', 'Audit');

        viewModel.attr('instance.type', 'Issue');
        viewModel.attr('instance.allow_unmap_from_audit', false);

        expect(viewModel.attr('denyIssueUnmap')).toBe(true);
      });

      it('returns true if instance.type equals to "Audit" and ' +
      'page_instance.allow_unmap_from_audit is false', function () {
        viewModel.attr('instance.type', 'Audit');

        viewModel.attr('page_instance.type', 'Issue');
        viewModel.attr('page_instance.allow_unmap_from_audit', false);
        expect(viewModel.attr('denyIssueUnmap')).toBe(true);
      });

      it('returns false if page_instance.type equals to "Audit" and' +
      'instance.allow_unmap_from_audit is true', function () {
        viewModel.attr('page_instance.type', 'Audit');

        viewModel.attr('instance.type', 'Issue');
        viewModel.attr('instance.allow_unmap_from_audit', true);

        expect(viewModel.attr('denyIssueUnmap')).toBe(false);
      });

      it('returns false if instance.type equals to "Audit" and ' +
      'page_instance.allow_unmap_from_audit is true', function () {
        viewModel.attr('instance.type', 'Audit');

        viewModel.attr('page_instance.type', 'Issue');
        viewModel.attr('page_instance.allow_unmap_from_audit', true);
        expect(viewModel.attr('denyIssueUnmap')).toBe(false);
      });

      it('returns false if page_instance.type is Issue and instance.type do ' +
      'not equal to "Audit"', function () {
        viewModel.attr('instance.type', 'Type');
        viewModel.attr('page_instance', 'Issue');
        expect(viewModel.attr('denyIssueUnmap')).toBe(false);
      });

      it('returns false if instance.type is Issue and page_instance.type do ' +
      'not equal to "Audit"', function () {
        viewModel.attr('instance.type', 'Issue');
        viewModel.attr('page_instance', 'Type');
        expect(viewModel.attr('denyIssueUnmap')).toBe(false);
      });
    });

    describe('isAllowedToUnmap get() method', () => {
      beforeEach(() => {
        spyOn(Mappings, 'allowedToUnmap');
        spyOn(CurrentPageUtils, 'isAllObjects');
        spyOn(CurrentPageUtils, 'isMyWork');

        viewModel.attr('instance', {type: 'any type'});
        viewModel.attr('options', {});
      });

      it('returns false if unmapping is not allowed', () => {
        Mappings.allowedToUnmap.and.returnValue(false);

        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(false);
        expect(Mappings.allowedToUnmap).toHaveBeenCalled();
      });

      it('returns false when user is on "My Work" page', () => {
        Mappings.allowedToUnmap.and.returnValue(true);

        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(true);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(false);
      });

      it('returns false when user is on "All Objects" page', () => {
        Mappings.allowedToUnmap.and.returnValue(true);

        CurrentPageUtils.isAllObjects.and.returnValue(true);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(false);
      });

      it('returns false when instance is not directly related to ' +
        'parent instance', () => {
        Mappings.allowedToUnmap.and.returnValue(true);

        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);

        viewModel.attr('options.isDirectlyRelated', false);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(false);
      });

      it('returns false when denyIssueUnmap prop is true', () => {
        Mappings.allowedToUnmap.and.returnValue(true);

        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);

        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(true);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(false);
      });

      it('returns true when unmapping is allowed', () => {
        Mappings.allowedToUnmap.and.returnValue(true);

        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(true);
      });

      it('returns false when parent instance is Assessment and ' +
        'snapshot is archived', () => {
        Mappings.allowedToUnmap.and.returnValue(true);
        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);

        viewModel.attr('page_instance.type', 'Assessment');
        viewModel.attr('instance.type', 'Snapshot');
        viewModel.attr('instance.archived', true);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(false);
      });

      it('returns true when parent instance is Assessment and ' +
        'snapshot is not archived', () => {
        Mappings.allowedToUnmap.and.returnValue(true);
        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);

        viewModel.attr('page_instance.type', 'Assessment');
        viewModel.attr('instance.type', 'Snapshot');
        viewModel.attr('instance.archived', false);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(true);
      });

      it('returns true when parent instance is Issue and ' +
        'snapshot is archived', () => {
        Mappings.allowedToUnmap.and.returnValue(true);
        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);

        viewModel.attr('page_instance.type', 'Issue');
        viewModel.attr('instance.type', 'Snapshot');
        viewModel.attr('instance.archived', true);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(true);
      });

      it('returns false when _is_sox_restricted of ' +
      'parent instance is true', () => {
        Mappings.allowedToUnmap.and.returnValue(true);
        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);
        viewModel.attr('page_instance.type', 'Assessment');
        viewModel.attr('instance.type', 'Snapshot');
        viewModel.attr('instance.archived', false);

        viewModel.attr('page_instance._is_sox_restricted', true);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(false);
      });

      it('returns false when _is_sox_restricted of instance is true', () => {
        Mappings.allowedToUnmap.and.returnValue(true);
        CurrentPageUtils.isAllObjects.and.returnValue(false);
        CurrentPageUtils.isMyWork.and.returnValue(false);
        viewModel.attr('options.isDirectlyRelated', true);
        spyProp(viewModel, 'denyIssueUnmap').and.returnValue(false);
        viewModel.attr('page_instance.type', 'Assessment');
        viewModel.attr('instance.type', 'Snapshot');
        viewModel.attr('instance.archived', false);

        viewModel.attr('instance._is_sox_restricted', true);

        expect(viewModel.attr('isAllowedToUnmap')).toBe(false);
      });
    });
  });
});
