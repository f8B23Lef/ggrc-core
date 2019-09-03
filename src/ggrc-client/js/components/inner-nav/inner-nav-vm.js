/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import loIncludes from 'lodash/includes';
import loFind from 'lodash/find';
import loFindIndex from 'lodash/findIndex';
import loSortBy from 'lodash/sortBy';
import loMap from 'lodash/map';
import isEmptyObject from 'can-util/js/is-empty-object/is-empty-object';
import canList from 'can-list';
import canMap from 'can-map';
import {
  isAdmin,
} from '../../plugins/utils/current-page-utils';
import {getCounts} from '../../plugins/utils/widgets-utils';
import router, {buildUrl} from '../../router';
import {isObjectVersion} from '../../plugins/utils/object-versions-utils';
import {allowedToCreateOrMap} from '../../models/mappers/mappings';

export default canMap.extend({
  define: {
    counts: {
      get() {
        return getCounts().attr();
      },
    },
    showTabs: {
      get() {
        let counts = this.attr('counts');
        let isEmptyCounts = isEmptyObject(counts);
        return !isEmptyCounts || isAdmin();
      },
    },
    showAllTabs: {
      get() {
        let instance = this.attr('instance');
        let model = instance.constructor;
        return model.obj_nav_options.show_all_tabs;
      },
    },
  },
  instance: null,
  activeWidget: null,
  widgetDescriptors: [],
  widgetList: [],
  hiddenWidgets: null,
  initVM() {
    this.handleDescriptors();

    // add default sorting for hidden widgets by title
    let hiddenWidgets = new canList();
    hiddenWidgets.attr('comparator', 'title');
    this.attr('hiddenWidgets', hiddenWidgets);

    // set up routing
    router.bind('widget', (ev, newVal) => {
      this.route(newVal);
    });

    this.route(router.attr('widget'));
  },
  /**
     * Converts all descriptors to tabs view models
     */
  handleDescriptors() {
    let descriptors = this.attr('widgetDescriptors');
    let widgets = loMap(descriptors,
      (descriptor) => this.createWidget(descriptor));

    widgets = loSortBy(widgets, ['order', 'title']);

    this.attr('widgetList', widgets);
  },
  /**
     * Creates tab's view model
     * @param {Object} descriptor widget descriptor
     * @return {Object} view model
     */
  createWidget(descriptor) {
    let id = descriptor.widget_id;
    let widgetName = descriptor.widget_name;
    let title = typeof widgetName === 'function'
      ? widgetName() : widgetName;
    let countsName = descriptor.countsName ||
      descriptor.content_controller_options.countsName ||
      descriptor.model.model_singular;
    let model = this.attr('instance').constructor;
    let forceShowList = model.obj_nav_options.force_show_list || [];

    let widget = {
      id,
      title,
      type: isObjectVersion(id) ? 'version' : '',
      icon: descriptor.widget_icon,
      href: buildUrl({widget: id}),
      model: descriptor.model,
      order: descriptor.order,
      uncountable: descriptor.uncountable,
      count: 0,
      countsName: !descriptor.uncountable ? countsName : '',
      forceShow: false,
      inForceShowList: loIncludes(forceShowList, title),
    };

    return widget;
  },
  /**
     * Configures widgets to display in Add Tab button dropdown
     * @param {canMap} widget widget object
     */
  updateHiddenWidgets(widget) {
    let instance = this.attr('instance');
    let targetType = widget.model.model_singular;

    if (this.attr('showAllTabs')
      || widget.attr('inForceShowList')
      || widget.attr('type') === 'version'
      || widget.attr('uncountable')
      || !allowedToCreateOrMap(instance, targetType)) {
      // widget will never be in hiddenWidgets
      return;
    }

    if (widget.attr('count') === 0 && !widget.attr('forceShow')) {
      // add to hidden widgets list
      this.addToHiddenWidgets(widget);
    } else {
      this.removeFromHiddenWidgets(widget);
    }
  },
  /**
     * Adds widget to hiddenWidgets for Add tab button
     * @param {canMap} widget widget
     */
  addToHiddenWidgets(widget) {
    let hiddenWidgets = this.attr('hiddenWidgets');
    let hiddenWidget =
      loFind(hiddenWidgets, (hidden) => hidden.id === widget.id);

    if (!hiddenWidget) {
      hiddenWidgets.push(widget);
    }
  },
  /**
     * Removes widgets from hiddenWidgets for Add tab button
     * @param {canMap} widget widget
     */
  removeFromHiddenWidgets(widget) {
    let hiddenWidgets = this.attr('hiddenWidgets');
    let index = loFindIndex(hiddenWidgets,
      (hiddenWidget) => hiddenWidget.id === widget.id);

    if (index > -1) {
      hiddenWidgets.splice(index, 1);
    }
  },
  /**
     * Handles selecting tab
     * @param {string} widgetId selected widget id
     */
  route(widgetId) {
    let widget = this.findWidgetById(widgetId);
    if (!widget && this.attr('widgetList').length) {
      let widgetId = this.attr('widgetList')[0].id;
      router.attr('widget', widgetId);
      return;
    }

    if (widget) {
      widget.attr('forceShow', true); // to show tabs with 0 count
      this.attr('activeWidget', widget);
      this.dispatch({type: 'activeChanged', widget});
      this.updateHiddenWidgets(widget);
    }
  },
  /**
     * Searches widget by Id in widgetList collection
     * @param {string} widgetId widget id
     * @return {canMap} widget
     */
  findWidgetById(widgetId) {
    return loFind(this.attr('widgetList'),
      (widget) => widget.id === widgetId);
  },
  /**
     * Searches widget by countName in widgetList collection
     * @param {string} countsName counts name prop in widget
     * @return {canMap} widget
     */
  findWidgetByCountsName(countsName) {
    return loFind(this.attr('widgetList'),
      (widget) => widget.countsName === countsName);
  },
  /**
     * Sets objects count for widget
     * @param {string} name countsName prop in widget
     * @param {*} count objects count
     */
  setWidgetCount(name, count) {
    let widget = this.findWidgetByCountsName(name);
    if (widget) {
      widget.attr({
        count,
      });

      this.updateHiddenWidgets(widget);
    }
  },
  /**
     * Handles tab closing
     * @param {Object} event contains closed widget
     */
  closeTab(event) {
    let widget = event.widget;
    widget.attr('forceShow', false);

    let currentWidget = router.attr('widget');
    if (currentWidget === widget.id) {
      router.attr('widget', this.attr('widgetList.0.id')); // Switch to the first widget
    }

    this.updateHiddenWidgets(widget);
  },
});
