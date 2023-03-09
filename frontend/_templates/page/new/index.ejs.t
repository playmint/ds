---
to: src/pages/<%= h.changeCase.param(name) %>.tsx
---
/** @format */

const <%= h.changeCase.pascal(name) %>Page = () => {
    return <div><%= h.changeCase.pascal(name) %> Page!</div>;
};

export default <%= h.changeCase.pascal(name) %>Page;