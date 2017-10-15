module.exports = function(wallaby) {
    return {
        files: [
            'src/**/*.ts',
            '!src/**/*.spec.ts'
        ],

        tests: [
            'src/**/*.spec.ts'
        ],

        testFramework: 'mocha',

        env: {
            type: 'node',
            runner: 'node'
        }
    };
};