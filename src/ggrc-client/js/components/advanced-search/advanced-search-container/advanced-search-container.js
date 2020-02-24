/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/


import '../../../components/advanced-search/advanced-search-filter-container';
import '../../../components/advanced-search/advanced-search-mapping-container';

import canComponent from 'can-component';
import canStache from 'can-stache';
import canDefineMap from 'can-define/map/map';
import canList from 'can-list';
import template from './advanced-search-container.stache';

const ViewModel = canDefineMap.extend({
  filterItems: {
    Type: canList,
    value: () => [],
  },
  defaultFilterItems: {
    value: () => [],
  },
  availableAttributes: {
    value: () => [],
  },
  statesCollectionKey: {
    value: () => [],
  },
  mappingItems: {
    Type: canList,
    value: () => [],
  },
  modelName: {
    value: null,
  },
  mappedToItems: {
    value: () => [],
  },
  filterOperatorOptions: {
    value: null,
  },
  disabled: {
    value: false,
  },
  showOperator: {
    value: true,
  },
  resetFilters() {
    this.filterItems = this.defaultFilterItems.serialize();
    this.mappingItems = [];
  },
  onSubmit() {
    this.dispatch('onSubmit');
  },
});

export default canComponent.extend({
  tag: 'advanced-search-container',
  view: canStache(template),
  ViewModel,
});
