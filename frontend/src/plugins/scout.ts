/** @format */

import { PluginTrust, PluginType } from 'dawnseekers';

const src = `class Plugin {
    state = {};
    dispatching = false;
    ds = {};

    constructor(ds) {
        this.ds = ds;
    }

    onState(state) {
        this.state = state;
    }

    onClick() {
        const { seeker, tiles } = this.state.ui.selection;
        if (!seeker) {
            return;
        }
        if (!tiles || tiles.length != 1) {
            return;
        }
        const { q, r, s } = tiles[0].coords;
        this.ds.dispatch('SCOUT_SEEKER', seeker.key, q, r, s).finally(() => (this.dispatching = false));
    }

    onSubmit() {
        return false;
    }

    showTileActionDetails() {
        return false;
    }

    renderTileActionDetails() {
        return undefined;
    }

    renderTileActionButtons() {
        const { seeker, tiles } = this.state.ui.selection;
        if (!seeker) {
            return;
        }
        if (!tiles || tiles.length != 1) {
            return;
        }
        const tile = tiles[0];
        if (!tile) {
            return;
        }
        if (tile.biome != 0) {
            return;
        }
        const { q, r, s } = tile.coords;
        return '<button id="scout" class="action-button">SCOUT at ' + q + ',' + r + ',' + s + '</button>';
    }
};`;

const plugin = {
    type: PluginType.CORE,
    trust: PluginTrust.TRUSTED,
    addr: '',
    src: src
};

export default plugin;
