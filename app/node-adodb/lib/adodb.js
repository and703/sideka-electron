!function(){"use strict";function e(e){WScript.StdOut.Write(encodeURI(JSON.stringify(e)))}function t(e){var t=[],n=e.Fields,r=n.Count;if(!e.BOF||!e.EOF){var o,c,i,a;for(e.MoveFirst();!e.EOF;){for(c={},o=0;o<r;o++)"date"==typeof(a=(i=n.Item(o)).Value)&&(a=new Date(a)),c[i.Name]=a;t.push(c),e.MoveNext()}}return t}function n(e){for(var t={},n=e.Properties,r=n.Count,o=0;o<r;o++)prop=n.Item(o),t[prop.Name]={Type:prop.Type,Value:prop.Value};return t}function r(e){var t={};if(!e.BOF||!e.EOF)for(var r,o=e.Fields,c=o.Count,i=0;i<c;i++)t[(r=o.Item(i)).Name]={Attributes:r.Attributes,DefinedSize:r.DefinedSize,NumericScale:r.NumericScale,Precision:r.Precision,Type:r.Type,Properties:n(r)};return t}function o(e){e.State&&e.Close()}"object"!=typeof JSON&&(JSON={}),function(){function e(e){return e<10?"0"+e:e}function t(){return this.valueOf()}function n(e){return u.lastIndex=0,u.test(e)?'"'+e.replace(u,function(e){var t=p[e];return"string"==typeof t?t:"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+e+'"'}function r(e,t){var o,c,i,a,u,s=f,p=t[e];switch(p&&"object"==typeof p&&"function"==typeof p.toJSON&&(p=p.toJSON(e)),"function"==typeof O&&(p=O.call(t,e,p)),typeof p){case"string":return n(p);case"number":return isFinite(p)?String(p):"null";case"boolean":case"null":return String(p);case"object":if(!p)return"null";if(f+=l,u=[],"[object Array]"===Object.prototype.toString.apply(p)){for(a=p.length,o=0;o<a;o+=1)u[o]=r(o,p)||"null";return i=0===u.length?"[]":f?"[\n"+f+u.join(",\n"+f)+"\n"+s+"]":"["+u.join(",")+"]",f=s,i}if(O&&"object"==typeof O)for(a=O.length,o=0;o<a;o+=1)"string"==typeof O[o]&&(i=r(c=O[o],p))&&u.push(n(c)+(f?": ":":")+i);else for(c in p)Object.prototype.hasOwnProperty.call(p,c)&&(i=r(c,p))&&u.push(n(c)+(f?": ":":")+i);return i=0===u.length?"{}":f?"{\n"+f+u.join(",\n"+f)+"\n"+s+"}":"{"+u.join(",")+"}",f=s,i}}var o=/^[\],:{}\s]*$/,c=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,i=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,a=/(?:^|:|,)(?:\s*\[)+/g,u=/[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,s=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;"function"!=typeof Date.prototype.toJSON&&(Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+e(this.getUTCMonth()+1)+"-"+e(this.getUTCDate())+"T"+e(this.getUTCHours())+":"+e(this.getUTCMinutes())+":"+e(this.getUTCSeconds())+"Z":null},Boolean.prototype.toJSON=t,Number.prototype.toJSON=t,String.prototype.toJSON=t);var f,l,p,O;"function"!=typeof JSON.stringify&&(p={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},JSON.stringify=function(e,t,n){var o;if(f="",l="","number"==typeof n)for(o=0;o<n;o+=1)l+=" ";else"string"==typeof n&&(l=n);if(O=t,t&&"function"!=typeof t&&("object"!=typeof t||"number"!=typeof t.length))throw new Error("JSON.stringify");return r("",{"":e})}),"function"!=typeof JSON.parse&&(JSON.parse=function(e,t){function n(e,r){var o,c,i=e[r];if(i&&"object"==typeof i)for(o in i)Object.prototype.hasOwnProperty.call(i,o)&&((c=n(i,o))!==undefined?i[o]=c:delete i[o]);return t.call(e,r,i)}var r;if(e=String(e),s.lastIndex=0,s.test(e)&&(e=e.replace(s,function(e){return"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})),o.test(e.replace(c,"@").replace(i,"]").replace(a,"")))return r=eval("("+e+")"),"function"==typeof t?n({"":r},""):r;throw new SyntaxError("JSON.parse")})}();var c={execute:function(n){var r,c={valid:!0},i=!!n.scalar,a=new ActiveXObject("ADODB.Connection");i&&(r=new ActiveXObject("ADODB.Recordset")),a.CursorLocation=3;try{a.Open(n.connection),a.Execute(n.sql),i&&(r.Open(n.scalar,a,0,1),c.records=t(r))}catch(u){c.valid=!1,c.message=u.message}e(c),o(a),i&&o(r)},query:function(n){var c=!!n.schema,i=new ActiveXObject("ADODB.Connection"),a=new ActiveXObject("ADODB.Recordset"),u={valid:!0};i.CursorLocation=3;try{i.Open(n.connection),a.Open(n.sql,i,0,1),u.records=t(a),c&&(u.schema=r(a))}catch(s){u.valid=!1,u.message=s.message}e(u),o(a),o(i)},executeWithTransaction:function(n){var r,c={valid:!0},i=!!n.scalar,a=new ActiveXObject("ADODB.Connection");i&&(r=new ActiveXObject("ADODB.Recordset")),a.CursorLocation=3;try{a.Open(n.connection),a.BeginTrans(),a.Execute(n.sql),i&&(r.Open(n.scalar,a,0,1),c.records=t(r)),a.CommitTrans()}catch(u){a.RollbackTrans(),c.valid=!1,c.message=u.message}e(c),o(a),i&&o(r)},queryWithTransaction:function(n){var c=!!n.schema,i=new ActiveXObject("ADODB.Connection"),a=new ActiveXObject("ADODB.Recordset"),u={valid:!0};i.CursorLocation=3;try{i.Open(n.connection),i.BeginTrans(),a.Open(n.sql,i,0,1),u.records=t(a),c&&(u.schema=r(a)),i.CommitTrans()}catch(s){i.RollbackTrans(),u.valid=!1,u.message=s.message}e(u),o(a),o(i)},bulkExecuteWithTransaction:function(t){var n={valid:!0},r=new ActiveXObject("ADODB.Connection");r.CursorLocation=3;try{r.Open(t.connection),r.BeginTrans();for(var c=0;c<t.sql.length;c++)r.Execute(t.sql[c]);r.CommitTrans()}catch(i){r.RollbackTrans(),n.valid=!1,n.message=i.message}e(n),o(r)}};try{c[WScript.Arguments(0)](JSON.parse(decodeURI(WScript.Arguments(1))))}catch(i){e({valid:!1,message:i.message})}}();