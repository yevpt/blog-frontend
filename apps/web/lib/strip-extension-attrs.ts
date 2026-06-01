/**
 * 清除浏览器扩展 / Chrome 自动填充注入的 DOM attribute，避免 SSR hydration mismatch。
 *
 * 常见来源：
 * - Chrome autofill: __gcruniqueid / __gchrome_uniqueid
 * - ColorZilla 等扩展: cz-shortcut-listen
 *
 * @see https://github.com/facebook/react/issues/33635
 */
export const STRIP_EXTENSION_ATTRS_SCRIPT = `(function(){
var ATTRS=["__gcruniqueid","__gchrome_uniqueid","cz-shortcut-listen"];
function strip(el){
  if(!el||!el.removeAttribute)return;
  for(var i=0;i<ATTRS.length;i++)el.removeAttribute(ATTRS[i]);
}
function stripTree(root){
  strip(root);
  if(!root.querySelectorAll)return;
  var nodes=root.querySelectorAll("input,textarea,select,form");
  for(var i=0;i<nodes.length;i++)strip(nodes[i]);
}
stripTree(document.documentElement);
if(typeof MutationObserver==="undefined")return;
var observer=new MutationObserver(function(mutations){
  for(var i=0;i<mutations.length;i++){
    var m=mutations[i];
    if(m.type==="attributes")strip(m.target);
    if(m.type==="childList"){
      for(var j=0;j<m.addedNodes.length;j++){
        var node=m.addedNodes[j];
        if(node.nodeType===1)stripTree(node);
      }
    }
  }
});
observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:ATTRS,childList:true});
window.addEventListener("load",function(){observer.disconnect();},{once:true});
})();`;
