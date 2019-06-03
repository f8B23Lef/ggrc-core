/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canComponent from 'can-component';
import canMap from 'can-map';
import canStache from 'can-stache';
import template from './person-autocomplete-field.stache';

const KEYS_TO_LISTEN = ['ArrowUp', 'ArrowDown', 'Enter'];

/**
 * Another person autocomplete field
 **/

export default canComponent.extend({
  tag: 'person-autocomplete-field',
  view: canStache(template),
  viewModel: canMap.extend({
    personEmail: '',
    showResults: false,
    inputId: '',
    tabindex: -1,
    placeholder: '',
    personSelected({person}) {
      this.attr('personEmail', person.email);
    },
    onActionKey(keyCode) {
      if (this.attr('showResults')) {
        // trigger setter of 'actionKey'
        this.attr('actionKey', keyCode);
        // reset 'actionKey'
        this.attr('actionKey', null);
      }
    },
    onKeyUp(event) {
      const inputValue = event.target.value;
      this.attr('personEmail', inputValue);
      if (KEYS_TO_LISTEN.includes(event.code)) {
        this.onActionKey(event.keyCode);
        event.preventDefault();
      } else {
        this.attr('searchValue', inputValue);
      }
    },
  }),
  events: {
    '{window} click'() {
      this.viewModel.attr('showResults', false);
    },
  },
});
