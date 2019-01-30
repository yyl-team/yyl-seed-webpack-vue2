import Vue from 'vue';
import { mapGetters, mapActions } from 'vuex';
import jsonp from 'jsonp';

import tpl from './p-index.pug';
import './p-index.scss';
import vDemo from '../../widget/v-demo/v-demo.vue';
import vNav from '../../widget/v-nav/v-nav.vue';

export default Vue.extend({
  template: tpl(),
  methods: {
    ...mapActions(['addDemoLog'])
  },
  computed: {
    ...mapGetters(['demoLogs'])
  },
  data() {
    return {
    };
  },
  components: {
    vDemo,
    vNav
  },
  mounted() {
    const vm = this;
    vm.addDemoLog('p-index is ready');
    vm.addDemoLog(`now in ${process.env.NODE_ENV}`);

    jsonp('http://w-ydzx.yy.com/nav/index/idx', {}, (err, data) => {
      vm.addDemoLog(`get data success ${JSON.stringify(data)}`);
    });
  }
});
