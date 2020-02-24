/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import canStache from 'can-stache';
import canList from 'can-list';
import canComponent from 'can-component';
import './advanced-search-filter-attribute';
import './advanced-search-filter-group';
import './advanced-search-filter-operator';
import './advanced-search-filter-state';
import AdvancedSearchContainer from '../view-models/advanced-search-container-vm';
import * as StateUtils from '../../plugins/utils/state-utils';
import * as AdvancedSearch from '../../plugins/utils/advanced-search-utils';
import template from './advanced-search-filter-container.stache';

/**
 * Filter Container view model.
 * Contains logic used in Filter Container component
 * @constructor
 */
const ViewModel = AdvancedSearchContainer.extend({
  /**
   * Contains Filter Attributes, Groups and Operators.
   * Initializes Items with State Attribute by default.
   * @type {canList}
   */
  items: {
    Type: canList,
    Value: canList,
    get(items) {
      if (this.defaultStatusFilter && items && !items.length &&
        StateUtils.hasFilter(this.modelName)) {
        const stateItem = AdvancedSearch.setDefaultStatusConfig(
          this.modelName,
          this.statesCollectionKey
        );

        items.push(AdvancedSearch.create.state(stateItem));
      }

      return items;
    },
  },
  /**
   * Indicates whether status filter should be added by default.
   * @type {boolean}
   */
  defaultStatusFilter: {
    type: 'boolean',
    value: true,
  },
  /**
   * Indicates whether 'Add' button should be displayed.
   */
  showAddButton: {
    type: 'boolean',
    value: true,
  },
  /**
   * Contains specific model name.
   * @type {string}
   * @example
   * Requirement
   * Regulation
   */
  modelName: {
    value: null,
  },
  /**
   * Contains available attributes for specific model.
   * @type {canList}
   */
  availableAttributes: {
    Type: canList,
    Value: canList,
  },
  /**
   * Indicates whether Operator field should be displayed.
   */
  showOperator: {
    value: true,
  },
  /**
   * Indicates whether Filter State should be disabled
   */
  disabledState: {
    value: false,
  },
  /**
   * Contains key of collection which will be used to get list of available
   * statuses for certain model.
   * @type {Symbol|null}
   */
  statesCollectionKey: {
    value: null,
  },
  /**
   * Contains list of options for "operator" control. May used, for example,
   * to disable changing of operator (using {disable: true} option).
   * @type {object|null}
   */
  filterOperatorOptions: {
    value: null,
  },
  /**
   * Adds Filter Operator and Filter Attribute to the collection.
   */
  addFilterCriterion() {
    let items = this.items;
    if (items.length) {
      items.push(AdvancedSearch.create.operator(
        'AND',
        this.filterOperatorOptions)
      );
    }
    items.push(AdvancedSearch.create.attribute());
  },
  /**
   * Transforms Filter Attribute to Filter Group.
   * @param {canMap} attribute - Filter Attribute.
   */
  createGroup(attribute) {
    let items = this.items;
    let index = items.indexOf(attribute);
    items.attr(index, AdvancedSearch.create.group([
      attribute,
      AdvancedSearch.create.operator('AND'),
      AdvancedSearch.create.attribute(),
    ]));
  },
  isAttributeActionsShown(isAttrDisabled = false) {
    return !isAttrDisabled;
  },
});

/**
 * Filter Container is a component allowing to compose Filter Attributes, Groups and Operators.
 */
export default canComponent.extend({
  tag: 'advanced-search-filter-container',
  view: canStache(template),
  leakScope: true,
  ViewModel,
});
