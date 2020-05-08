/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Component from '../assessments-bulk-complete-table-row';
import {getComponentVM} from '../../../../../../js_specs/spec-helpers';
import * as CaUtils from '../../../../../plugins/utils/ca-utils';
import * as GgrcUtils from '../../../../../plugins/ggrc-utils';

describe('assessments-bulk-complete-table-row component', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = getComponentVM(Component);
  });

  describe('validateAttribute() method', () => {
    beforeEach(() => {
      spyOn(viewModel, 'performDropdownValidation');
      spyOn(viewModel, 'performDefaultValidation');
    });

    it('do nothing if attribute is not applicable',
      () => {
        const attribute = {
          id: 1,
          type: 'dropdown',
          isApplicable: false,
        };

        viewModel.validateAttribute(attribute);

        expect(viewModel.performDropdownValidation)
          .not.toHaveBeenCalledWith(attribute);
        expect(viewModel.performDefaultValidation)
          .not.toHaveBeenCalled();
      });

    it('calls performDropdownValidation() if attribute type is "dropdown"',
      () => {
        const attribute = {
          id: 1,
          type: 'dropdown',
          isApplicable: true,
        };

        viewModel.validateAttribute(attribute);

        expect(viewModel.performDropdownValidation)
          .toHaveBeenCalledWith(attribute);
        expect(viewModel.performDefaultValidation)
          .not.toHaveBeenCalled();
      });

    it('calls performDefaultValidation() if attribute type is not "dropdown"',
      () => {
        const attribute = {
          id: 1,
          type: 'input',
          isApplicable: true,
        };

        viewModel.validateAttribute(attribute);

        expect(viewModel.performDefaultValidation)
          .toHaveBeenCalledWith(attribute);
        expect(viewModel.performDropdownValidation)
          .not.toHaveBeenCalled();
      });
  });

  describe('performDropdownValidation() method', () => {
    let getRequiredInfoStatesSpy;

    beforeEach(() => {
      getRequiredInfoStatesSpy = spyOn(viewModel, 'getRequiredInfoStates');
    });

    describe('if dropdown requires attachments', () => {
      it('should set empty attachments to attribute, not valid and ' +
      'has missing info to true', () => {
        getRequiredInfoStatesSpy.and.returnValue({
          comment: false,
          attachment: false,
          url: true,
        });

        const attribute = {
          attachments: null,
          validation: {
            valid: true,
            hasMissingInfo: false,
          },
        };

        viewModel.performDropdownValidation(attribute);

        expect(attribute.attachments).toEqual({
          comment: null,
          files: [],
          urls: [],
        });
        expect(attribute.validation.valid).toBe(false);
        expect(attribute.validation.hasMissingInfo).toBe(true);
      });
    });

    describe('if dropdown does not require attachments', () => {
      beforeEach(() => {
        getRequiredInfoStatesSpy.and.returnValue({
          comment: false,
          attachment: false,
          url: false,
        });
      });

      it('should set null to attribute attachments and ' +
      'false to has missing info', () => {
        const attribute = {
          attachments: null,
          validation: {
            hasMissingInfo: false,
          },
        };

        viewModel.performDropdownValidation(attribute);

        expect(attribute.attachments).toBeNull();
        expect(attribute.validation.hasMissingInfo).toBe(false);
      });

      it('should set valid to true if attribute is not mandatory', () => {
        const attribute = {
          validation: {
            valid: false,
            mandatory: false,
          },
        };

        viewModel.performDropdownValidation(attribute);

        expect(attribute.validation.valid).toBe(true);
      });

      it('should set valid to true if it is mandatory attribute ' +
      'and value is not empty', () => {
        const attribute = {
          value: 'Some text',
          validation: {
            valid: false,
            mandatory: true,
          },
        };

        viewModel.performDropdownValidation(attribute);

        expect(attribute.validation.valid).toBe(true);
      });

      it('should set valid to false if it is mandatory attribute ' +
      'and value is empty', () => {
        const attribute = {
          value: '',
          validation: {
            valid: true,
            mandatory: true,
          },
        };

        viewModel.performDropdownValidation(attribute);

        expect(attribute.validation.valid).toBe(false);
      });
    });
  });

  describe('performDefaultValidation() method', () => {
    describe('if type is "text" and attribute is mandatory', () => {
      let getPlainTextSpy;

      beforeEach(() => {
        getPlainTextSpy = spyOn(GgrcUtils, 'getPlainText');
      });

      it('should set valid to true if value is not empty', () => {
        const attribute = {
          type: 'text',
          value: 'Some text',
          validation: {
            mandatory: true,
            valid: false,
          },
        };
        getPlainTextSpy.withArgs('Some text').and.returnValue('Some text');

        viewModel.performDefaultValidation(attribute);

        expect(attribute.validation.valid).toBe(true);
      });

      it('should set valid to false if value is empty', () => {
        const attribute = {
          type: 'text',
          value: '  ',
          validation: {
            mandatory: true,
            valid: false,
          },
        };
        getPlainTextSpy.withArgs('  ').and.returnValue('');

        viewModel.performDefaultValidation(attribute);

        expect(attribute.validation.valid).toBe(false);
      });
    });

    describe('if type is "person" and attribute is mandatory', () => {
      it('should set valid to true if value is not empty', () => {
        const attribute = {
          type: 'person',
          value: [{
            id: 384,
          }],
          validation: {
            mandatory: true,
            valid: false,
          },
        };

        viewModel.performDefaultValidation(attribute);

        expect(attribute.validation.valid).toBe(true);
      });

      it('should set valid to false if value is empty', () => {
        const attribute = {
          type: 'person',
          value: [],
          validation: {
            mandatory: true,
            valid: true,
          },
        };

        viewModel.performDefaultValidation(attribute);

        expect(attribute.validation.valid).toBe(false);
      });
    });

    describe('if type is not "text" or "person" and attribute is mandatory',
      () => {
        it('should set valid to true if value is not empty', () => {
          const attribute = {
            type: 'input',
            value: 'Some text',
            validation: {
              mandatory: true,
              valid: false,
            },
          };

          viewModel.performDefaultValidation(attribute);

          expect(attribute.validation.valid).toBe(true);
        });

        it('should set valid to false if value is empty', () => {
          const attribute = {
            type: 'input',
            value: '',
            validation: {
              mandatory: true,
              valid: true,
            },
          };

          viewModel.performDefaultValidation(attribute);

          expect(attribute.validation.valid).toBe(false);
        });
      });
  });

  describe('getRequiredInfoStates() method', () => {
    it('calls ddValidationValueToMap()', () => {
      spyOn(CaUtils, 'ddValidationValueToMap');
      const attribute = {
        value: '1',
        multiChoiceOptions: {
          config: new Map([['1', 2], ['2', 4], ['3', 1]]),
        },
      };

      viewModel.getRequiredInfoStates(attribute);

      expect(CaUtils.ddValidationValueToMap).toHaveBeenCalledWith(2);
    });
  });

  describe('attributeValueChanged() method', () => {
    beforeEach(() => {
      viewModel.rowData = {
        attributes: [{
          id: 1,
          value: 'Some value 1',
        }, {
          id: 2,
          value: 'Some value 2',
        }],
      };
      spyOn(viewModel, 'validateAttribute');
    });

    it('sets new value to attribute', () => {
      viewModel.attributeValueChanged('New value', 1);

      expect(viewModel.rowData.attributes[1].value).toBe('New value');
    });

    it('calls validateAttribute()', () => {
      viewModel.attributeValueChanged('New value', 1);

      expect(viewModel.validateAttribute)
        .toHaveBeenCalledWith(viewModel.rowData.attributes[1]);
    });
  });

  describe('events', () => {
    let events;

    beforeAll(() => {
      events = Component.prototype.events;
    });

    describe('init() handler', () => {
      it('calls validateAttribute() for each attribute in row', () => {
        viewModel.rowData = {
          attributes: [{
            id: 1,
            type: 'input',
          }, {
            id: 2,
            type: 'text',
          }],
        };
        spyOn(viewModel, 'validateAttribute');

        events.init.apply({viewModel});

        viewModel.rowData.attributes.forEach((attribute) => {
          expect(viewModel.validateAttribute).toHaveBeenCalledWith(attribute);
        });
      });
    });
  });
});
