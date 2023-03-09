/** @format */

import { PluginTrust, PluginType } from '@app/contexts/dawnseekers-provider';

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
        this.ds.dispatch('MOVE_SEEKER', seeker.key, q, r, s).finally(() => (this.dispatching = false));
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
        console.log(tile);
        if (tile.biome != 1) {
            return;
        }
        const { q, r, s } = tile.coords;
        return '<button id="move" class="action-button">MOVE to ' + q + ',' + r + ',' + s + '</button>';
    }
};`;

const plugin = {
    type: PluginType.CORE,
    trust: PluginTrust.TRUSTED,
    addr: '',
    src: src
};

export default plugin;
