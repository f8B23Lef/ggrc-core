/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canComponent from 'can-component';
import canDefineMap from 'can-define/map/map';
import canStache from 'can-stache';
import template from './table-view.stache';
import '../table-view-header/table-view-header';
import '../table-view-row/table-view-row';

const ViewModel = canDefineMap.extend({seal: false}, {
  assessmentsList: {
    value: () => [],
  },
  attributesList: {
    value: () => [],
  },
  headersData: {
    get() {
      return this.attributesList.map((attribute) => {
        return {
          title: attribute.title,
          mandatory: attribute.mandatory,
        };
      });
    },
  },
  rowsData: {
    get() {
      return this.buildRowsData();
    },
  },
  buildRowsData() {
    let data = [];

    this.assessmentsList.forEach((assessment) => {
      const asmtData = {
        asmtTitle: assessment.title,
        asmtId: assessment.id,
        asmtStatus: assessment.status,
        asmtType: assessment.assessment_type,
      };
      let attrData = [];
      this.attributesList.forEach((attribute) => {
        attrData.push({
          attrTitle: attribute.title,
          value: attribute.values[assessment.id]
            ? attribute.values[assessment.id].value
            : 'Not applicable',
        });
      });

      data.push({attributes: attrData, ...asmtData});
    });

    return data;
  },
});

export default canComponent.extend({
  tag: 'table-view',
  view: canStache(template),
  ViewModel,
});
