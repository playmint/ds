var m={exports:{}};(function(l){var u={single_source_shortest_paths:function(o,e,t){var r={},n={};n[e]=0;var i=u.PriorityQueue.make();i.push(e,0);for(var a,c,s,p,_,h,f,v,d;!i.empty();){a=i.pop(),c=a.value,p=a.cost,_=o[c]||{};for(s in _)_.hasOwnProperty(s)&&(h=_[s],f=p+h,v=n[s],d=typeof n[s]>"u",(d||v>f)&&(n[s]=f,i.push(s,f),r[s]=c))}if(typeof t<"u"&&typeof n[t]>"u"){var y=["Could not find a path from ",e," to ",t,"."].join("");throw new Error(y)}return r},extract_shortest_path_from_predecessor_list:function(o,e){for(var t=[],r=e;r;)t.push(r),o[r],r=o[r];return t.reverse(),t},find_path:function(o,e,t){var r=u.single_source_shortest_paths(o,e,t);return u.extract_shortest_path_from_predecessor_list(r,t)},PriorityQueue:{make:function(o){var e=u.PriorityQueue,t={},r;o=o||{};for(r in e)e.hasOwnProperty(r)&&(t[r]=e[r]);return t.queue=[],t.sorter=o.sorter||e.default_sorter,t},default_sorter:function(o,e){return o.cost-e.cost},push:function(o,e){var t={value:o,cost:e};this.queue.push(t),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};l.exports=u})(m);export{m as d};
