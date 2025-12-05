module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs', { loose: true }],
    // Plugin to replace import.meta.env with global.import.meta.env
    function({ types: t }) {
      return {
        visitor: {
          MemberExpression(path) {
            const object = path.get('object');
            if (
              object.isMetaProperty() &&
              object.node.meta.name === 'import' &&
              object.node.property.name === 'meta' &&
              path.node.property.name === 'env'
            ) {
              path.replaceWith(
                t.memberExpression(
                  t.memberExpression(
                    t.identifier('global'),
                    t.identifier('import')
                  ),
                  t.identifier('meta.env')
                )
              );
            }
          },
        },
      };
    },
  ],
};