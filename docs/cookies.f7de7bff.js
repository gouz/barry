var e=("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{}).parcelRequire59e3;e.register("50we7",(function(n,o){var i=e("jN2Kb");n.exports=i.isStandardBrowserEnv()?{write:function(e,n,o,t,r,u){var d=[];d.push(e+"="+encodeURIComponent(n)),i.isNumber(o)&&d.push("expires="+new Date(o).toGMTString()),i.isString(t)&&d.push("path="+t),i.isString(r)&&d.push("domain="+r),!0===u&&d.push("secure"),document.cookie=d.join("; ")},read:function(e){var n=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return n?decodeURIComponent(n[3]):null},remove:function(e){this.write(e,"",Date.now()-864e5)}}:{write:function(){},read:function(){return null},remove:function(){}}}));