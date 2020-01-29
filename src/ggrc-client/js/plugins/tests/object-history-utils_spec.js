/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  buildRoleACL,
  buildModifiedListField,
  getInstanceView,
  buildModifiedAttValues,
} from '../utils/object-history-utils';
import {makeFakeInstance} from '../../../js_specs/spec-helpers';
import Vendor from '../../models/business-models/vendor';
import Risk from '../../models/business-models/risk';
import canMap from 'can-map';
import Standard from '../../models/business-models/standard';

describe('"buildModifiedACL" method', () => {
  it('should not add duplicates', () => {
    const currentAcl = [
      {ac_role_id: 5, person_id: 3},
      {ac_role_id: 5, person_id: 20},
    ];
    const modifiedRole = {
      added: [{id: 20}, {id: 30}],
      deleted: [],
    };

    const result = buildRoleACL(5, currentAcl, modifiedRole);
    expect(result.length).toBe(3);
  });

  it('should delete 2 items', () => {
    const currentAcl = [
      {ac_role_id: 5, person_id: 3},
      {ac_role_id: 5, person_id: 20},
    ];
    const modifiedRole = {
      added: [],
      deleted: [{id: 20}, {id: 30}, {id: 3}],
    };

    const result = buildRoleACL(5, currentAcl, modifiedRole);
    expect(result.length).toBe(0);
  });

  it('should add all modified people. current ACL is empty', () => {
    const currentAcl = [];
    const modifiedRole = {
      added: [
        {id: 20, email: 'akali@google.com'},
        {id: 30, email: 'twitch@google.com'},
      ],
      deleted: [],
    };

    const result = buildRoleACL(5, currentAcl, modifiedRole);
    expect(result.length).toBe(2);
    expect(result[0].person_email).toEqual('akali@google.com');
    expect(result[1].person_id).toEqual(30);
  });

  it('should add 1 item and remove 2 items', () => {
    const currentAcl = [
      {ac_role_id: 5, person_id: 3},
      {ac_role_id: 5, person_id: 20},
    ];
    const modifiedRole = {
      added: [{id: 25}],
      deleted: [{id: 20}, {id: 3}],
    };

    const result = buildRoleACL(5, currentAcl, modifiedRole);
    expect(result.length).toBe(1);
    expect(result[0].person_id).toEqual(25);
  });
});

describe('"buildModifiedListField" method', () => {
  it('should not add duplicates', () => {
    const currentField = [
      {id: 1, name: 'Category #1'},
      {id: 2, name: 'Category #2'},
    ];
    const modifiedField = {
      added: [
        {id: 1, name: 'Category #1'},
        {id: 3, name: 'Category #3'},
      ],
      deleted: [],
    };

    const result = buildModifiedListField(currentField, modifiedField);
    expect(result.length).toBe(3);
  });

  it('should add "added" items. current field is undefined', () => {
    const modifiedField = {
      added: [
        {id: 1, name: 'Category #1'},
        {id: 3, name: 'Category #3'},
      ],
      deleted: [
        {id: 2, name: 'Category #2'},
      ],
    };

    const result = buildModifiedListField(undefined, modifiedField);
    expect(result.length).toBe(2);
  });

  it('should delete 1 item', () => {
    const currentField = [
      {id: 1, name: 'Category #1'},
      {id: 2, name: 'Category #2'},
    ];
    const modifiedField = {
      deleted: [
        {id: 1, name: 'Category #1'},
        {id: 3, name: 'Category #3'},
      ],
      added: [],
    };

    const result = buildModifiedListField(currentField, modifiedField);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(2);
  });

  it('should add 2 items and delete 2 items', () => {
    const currentField = [
      {id: 1, name: 'Category #1'},
      {id: 2, name: 'Category #2'},
    ];
    const modifiedField = {
      added: [
        {id: 3, name: 'Category #3'},
        {id: 4, name: 'Category #4'},
      ],
      deleted: [
        {id: 1, name: 'Category #1'},
        {id: 2, name: 'Category #2'},
      ],
    };

    const result = buildModifiedListField(currentField, modifiedField);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(3);
    expect(result[1].id).toBe(4);
  });
});

describe('"getInstanceView" method', () => {
  let originalTemplates;

  beforeAll(() => {
    originalTemplates = GGRC.Templates;
    GGRC.Templates = {
      'risks/info': '<h1>Hello world</h1>',
      'controls/info': '<h1>Hello control</h1>',
    };
  });

  afterAll(() => {
    GGRC.Templates = originalTemplates;
  });

  it('should return empty string. instance is undefined', () => {
    const expectedPath = '';
    const view = getInstanceView();

    expect(view).toEqual(expectedPath);
  });

  it('should return default "view" path', () => {
    const expectedPath = '/base_objects/info.stache';

    // "GGRC.Templates" const doesn't contain template for Vendor
    const instance = makeFakeInstance({model: Vendor})();

    const view = getInstanceView(instance);
    expect(view).toEqual(expectedPath);
  });

  it('should return object "view" path', () => {
    const expectedPath = '/risks/info.stache';

    // "GGRC.Templates" const contains template for Risk
    const instance = makeFakeInstance({model: Risk})();

    const view = getInstanceView(instance);
    expect(view).toEqual(expectedPath);
  });

  it('should return directives "view" path for Standard', () => {
    const expectedPath = '/directives/info.stache';

    const instance = makeFakeInstance({model: Standard})();

    const view = getInstanceView(instance);
    expect(view).toEqual(expectedPath);
  });
});

describe('"buildModifiedAttValues" method', () => {
  let values;
  let definitions;

  beforeEach(() => {
    values = [
      {
        custom_attribute_id: 11,
        attribute_value: '',
        someProperty: 'some value 1',
      },
      {
        custom_attribute_id: 22,
        attribute_value: 'old value 2',
        someProperty: 'some value 2',
      },
      {
        custom_attribute_id: 33,
        attribute_value: 'old value 3',
        someProperty: 'some value 3',
      },
    ];

    definitions = [{id: 11}, {id: 22}, {id: 33}];
  });

  it('should return array without values that have no definitions',
    () => {
      const modifiedAttributes = new canMap({});
      definitions = [{id: 11}, {id: 33}];

      const expectedModifiedValue = [
        {
          custom_attribute_id: 11,
          attribute_value: '',
          someProperty: 'some value 1',
        },
        {
          custom_attribute_id: 33,
          attribute_value: 'old value 3',
          someProperty: 'some value 3',
        },
      ];

      const modifiedValues =
        buildModifiedAttValues(values, definitions, modifiedAttributes);

      expect(modifiedValues).toEqual(expectedModifiedValue);
    });

  it('should return array without changes if "modifiedAttr" is empty', () => {
    const modifiedAttributes = new canMap({});

    const expectedModifiedValue = [
      {
        custom_attribute_id: 11,
        attribute_value: '',
        someProperty: 'some value 1',
      },
      {
        custom_attribute_id: 22,
        attribute_value: 'old value 2',
        someProperty: 'some value 2',
      },
      {
        custom_attribute_id: 33,
        attribute_value: 'old value 3',
        someProperty: 'some value 3',
      },
    ];

    const modifiedValues =
      buildModifiedAttValues(values, definitions, modifiedAttributes);

    expect(modifiedValues).toEqual(expectedModifiedValue);
  });

  it(`should return array with modified "attribute_value" fields
  if fields were empty and became filled`,
  () => {
    const modifiedAttributes = new canMap({
      '11': {attribute_value: 'new value 1'},
    });

    const expectedModifiedValue = [
      {
        custom_attribute_id: 11,
        attribute_value: 'new value 1',
      },
      {
        custom_attribute_id: 22,
        attribute_value: 'old value 2',
        someProperty: 'some value 2',
      },
      {
        custom_attribute_id: 33,
        attribute_value: 'old value 3',
        someProperty: 'some value 3',
      },
    ];

    const modifiedValues =
      buildModifiedAttValues(values, definitions, modifiedAttributes);

    expect(modifiedValues).toEqual(expectedModifiedValue);
  });

  it(`should return array with modified attribute_value
  if the current field value has changed to another`,
  () => {
    const modifiedAttributes = new canMap({
      '33': {attribute_value: 'new value 3'},
    });

    const expectedModifiedValue = [
      {
        custom_attribute_id: 11,
        attribute_value: '',
        someProperty: 'some value 1',
      },
      {
        custom_attribute_id: 22,
        attribute_value: 'old value 2',
        someProperty: 'some value 2',
      },
      {
        custom_attribute_id: 33,
        attribute_value: 'new value 3',
        someProperty: 'some value 3',
      },
    ];

    const modifiedValues =
      buildModifiedAttValues(values, definitions, modifiedAttributes);

    expect(modifiedValues).toEqual(expectedModifiedValue);
  });
});
