import ds from "downstream";

export default async function update(state) {
    const buildings = state.world?.buildings || [];

    const someAction = () => {};

    return {
        version: 1,
        components: [
            {
                id: "tutorial-5",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: ``,

                        buttons: [
                            {
                                text: "Some button",
                                type: "action",
                                action: someAction,
                                disabled: false,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

const getBuildingsByType = (buildingsArray, type) => {
    return buildingsArray.filter((building) =>
        building.kind?.name?.value.toLowerCase().includes(type),
    );
};
