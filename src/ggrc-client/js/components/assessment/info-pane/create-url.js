/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canMap from 'can-map';
import canComponent from 'can-component';
import {notifier} from '../../../plugins/utils/notifiers-utils';
import {sanitizer} from '../../../plugins/utils/url-utils';
import Context from '../../../models/service-models/context';
import Evidence from '../../../models/business-models/evidence';
import pubSub from '../../../pub-sub';

export default canComponent.extend({
  tag: 'create-url',
  leakScope: true,
  viewModel: canMap.extend({
    value: null,
    context: null,
    create: function () {
      const url = sanitizer(this.attr('value'));

      if (!url.isValid) {
        return;
      }

      let attrs = {
        link: url.value,
        title: url.value,
        context: this.attr('context') || new Context({id: null}),
        kind: 'URL',
      };

      let evidence = new Evidence(attrs);
      this.dispatch({type: 'setEditMode'});

      pubSub.dispatch({
        type: 'relatedItemBeforeSave',
        items: [evidence],
        itemType: 'urls',
      });
      evidence.save()
        .fail(() => {
          notifier('error', 'Unable to create URL.');
        })
        .done((data) => {
          pubSub.dispatch({
            type: 'relatedItemSaved',
            item: data,
            itemType: 'urls',
          });
        });
    },
    clear: function () {
      this.dispatch({type: 'setEditMode'});
    },
  }),
});
