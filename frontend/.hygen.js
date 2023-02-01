/** @format */

function getComponentDirectory(componentType) {
    switch (componentType) {
        case 'molecule':
        case 'm':
            return 'molecules';

        case 'organism':
        case 'o':
            return 'organisms';

        case 'view':
        case 'v':
            return 'views';

        case 'atom':
        case 'a':
        default:
            return 'atoms';
    }
}

module.exports = {
    helpers: {
        getComponentDirectory: getComponentDirectory
    }
};
