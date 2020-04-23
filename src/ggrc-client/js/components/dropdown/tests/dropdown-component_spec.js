/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import loFilter from 'lodash/filter';
import canStache from 'can-stache';
import {getComponentVM} from '../../../../js_specs/spec-helpers';
import Component from '../dropdown-component';

describe('dropdown component', function () {
  'use strict';

  describe('rendering option list', function () {
    let template;

    beforeAll(function () {
      template = canStache(
        '<dropdown-component optionsList:from="list"></dropdown-component>');
    });

    it('when input is an array of strings', function () {
      let list = ['a', 'b', 'c', 'd'];
      let frag = template({
        list: list,
      });
      frag = $(frag);

      expect(frag.find('option').length).toEqual(list.length);
      $.each(frag.find('option'), function (index, el) {
        el = $(el);
        expect(el.text()).toEqual(list[index]);
        expect(el.val()).toEqual(list[index]);
      });
    });

    it('when input is an array of values', function () {
      let list = [{
        title: 'a',
        value: 1,
      }, {
        title: 'b',
        value: 2,
      }, {
        title: 'c',
        value: 3,
      }, {
        title: 'd',
        value: 4,
      }];
      let frag = template({
        list: list,
      });
      frag = $(frag);

      expect(frag.find('option').length).toEqual(list.length);
      $.each(frag.find('option'), function (index, el) {
        let item = list[index];
        el = $(el);
        expect(el.text()).toEqual(item.title);
        expect(el.val()).toEqual(String(item.value));
      });
    });

    it('when input is an array of grouped values', function () {
      let list = [{
        title: 'a',
        value: 1,
      }, {
        group: 'AA',
        subitems: [{
          title: 'aa',
          value: 11,
        }, {
          title: 'ab',
          value: 12,
        }, {
          title: 'ac',
          value: 13,
        }, {
          title: 'ad',
          value: 14,
        }],
      }, {
        group: 'BB',
        subitems: [{
          title: 'ba',
          value: 21,
        }, {
          title: 'bb',
          value: 22,
        }, {
          title: 'bc',
          value: 23,
        }, {
          title: 'bd',
          value: 24,
        }],
      }];
      let frag = template({
        list: list,
      });
      let groups = loFilter(list, function (item) {
        return item.group;
      });
      frag = $(frag);

      expect(frag.find('optgroup').length).toEqual(groups.length);
      $.each(frag.find('optgroup'), function (index, el) {
        let item = groups[index];
        el = $(el);
        expect(el.attr('label')).toEqual(item.group);
      });
      $.each(frag.find('optgroup:first options'), function (index, el) {
        let subitem = list[1].subitems[index];
        el = $(el);
        expect(el.attr('label')).toEqual(subitem.title);
        expect(el.val()).toEqual(String(subitem.value));
      });
    });
  });

  describe('build of options', function () {
    let viewModel;
    let optionsList = [
      {title: 'title 1', value: 'value1'},
      {title: 'title 2', value: 'value2'},
      {title: 'title 3', value: 'value3'},
    ];

    let optionsGroups = {
      group1: {
        name: 'group 1',
        items: [
          {value: 'gr_1_value_1', name: 'gr 1 name 1'},
          {value: 'gr_1_value_2', name: 'gr 1 name 2'},
          {value: 'gr_1_value_3', name: 'gr 1 name 3'},
        ],
      },
      group2: {
        name: 'group 2',
        items: [
          {value: 'gr_2_value_1', name: 'gr 2 name 1'},
          {value: 'gr_2_value_2', name: 'gr 2 name 2'},
        ],
      },
    };

    beforeEach(function () {
      viewModel = getComponentVM(Component);
      viewModel.attr('noValue', false);
    });

    it('should build list from optionsList', function () {
      let list;
      viewModel.attr('optionsList', optionsList);
      list = viewModel.attr('options');

      expect(list.length).toEqual(3);
      expect(list[0].title).toEqual(optionsList[0].title);
      expect(list[2].title).toEqual(optionsList[2].title);
    });

    it('should build list from optionsList with None', function () {
      let list;

      viewModel.attr('optionsList', optionsList);
      viewModel.attr('noValue', true);
      viewModel.attr('noValueLabel', '--');
      list = viewModel.attr('options');

      expect(list.length).toEqual(4);
      expect(list[0].title).toEqual('--');
      expect(list[3].title).toEqual(optionsList[2].title);
    });

    it('should build list from optionsGroups', function () {
      let list;
      viewModel.attr('optionsGroups', optionsGroups);
      viewModel.attr('isGroupedDropdown', true);
      list = viewModel.attr('options');

      expect(list.length).toEqual(2);
      expect(list[0].subitems.length).toEqual(3);
      expect(list[1].subitems.length).toEqual(2);
      expect(list[0].group).toEqual('group 1');
      expect(list[1].subitems[0].title).toEqual('gr 2 name 1');
    });

    it('should build list from optionsGroups with None', function () {
      let list;
      viewModel.attr('optionsGroups', optionsGroups);
      viewModel.attr('isGroupedDropdown', true);
      viewModel.attr('noValue', true);
      viewModel.attr('noValueLabel', '--');
      list = viewModel.attr('options');

      expect(list.length).toEqual(3);
      expect(list[0].subitems.length).toEqual(1);
      expect(list[1].subitems.length).toEqual(3);
      expect(list[2].subitems.length).toEqual(2);
      expect(list[1].group).toEqual('group 1');
      expect(list[0].group).toEqual('--');
      expect(list[2].subitems[0].title).toEqual('gr 2 name 1');
    });
  });
});
