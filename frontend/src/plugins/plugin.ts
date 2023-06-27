/** @format */

export class Plugin {
    state = {} as any;

    // onInit({}) {}

    onState(state: any) {
        this.state = state;
    }

    onClickShowCraftDetails() {
        this.state.showActionDetails = true;
    }

    // onSubmitCraft(values: any) {
    //     return ds.dispatch('DO_CRAFT', values).then(() => (this.state.showActionDetails = false));
    // }

    showTileActionDetails() {
        return this.state.showActionDetails;
    }

    renderTileActionButtons() {
        return '<button>hi</button>';
    }

    renderTileActionDetails() {
        const selectedTile = this.state.ui.selected.tiles.length === 1 && this.state.ui.selected.tiles[0];
        if (!selectedTile) {
            return;
        }
        const selectedMobileUnit = this.state.ui.selected.mobileUnit;
        if (!selectedMobileUnit) {
            return;
        }
        if (this.state.showActionDetails) {
            return `
                <form id="craft">
                    <button id="craft">Craft</button>'
                </form>
            `;
        }

        return `
            <button id="showCraftDetails">Craft</button>';
        `;
    }
}
