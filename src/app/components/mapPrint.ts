import { Component, ApplicationRef, ViewContainerRef, Input, Output, EventEmitter } from "@angular/core";
import { DomSanitizer, SafeResourceUrl, SafeUrl} from '@angular/platform-browser';
import { remote, shell } from "electron";

import { Subscription } from 'rxjs';

import * as $ from 'jquery';
import * as fs from 'fs';
import * as jetpack from 'fs-jetpack';
import * as ospath from 'path';
import * as d3 from 'd3';
import * as dot from 'dot';
import * as base64Img from 'base64-img';
import * as fileUrl from 'file-url';
import * as os from 'os';

import DataApiService from '../stores/dataApiService';
import MapUtils from '../helpers/mapUtils';
import SettingsService from '../stores/settingsService';

var temp = require('temp');
temp.dir = os.tmpdir();
temp.track();

@Component({
    selector: 'map-print',
    templateUrl: '../templates/mapPrint.html'
})
export default class MapPrintComponent {
    private _width;
    private _height;

    @Input()
    set width(value){
        this._width = value;
    }
    get width(){
        return this._width;
    }

    @Input()
    set height(value){
        this._height = value;
    }
    get height(){
        return this._height;
    }

    @Output()
    doPrint: EventEmitter<any> = new EventEmitter<any>();

    html: any;
    sanitizedHtml: any;
    bigConfig: any;
    settingsSubscription: Subscription;
    settings: any;

    constructor(private dataApiService: DataApiService, 
                private settingsService: SettingsService,
                private sanitizer: DomSanitizer){}

    ngOnInit(): void {
        this.bigConfig = jetpack.cwd(__dirname).read('bigConfig.json', 'json');
        this.settings = {};

        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.settings = settings; 
        });
    }

    initDragZoom(){
        var iframe : any = document.getElementById("map-preview");
        window["iframe"] = iframe;
        iframe.onload = function(){
            var $$ : any = $;
            var data : any = {scrollable : $(iframe.contentDocument),
                        acceptPropagatedEvent : true,
                        preventDefault : true}
            
            var dragscroll= {
                mouseDownHandler : function(event) {
                    // mousedown, left click, check propagation
                    if (event.which!=1 ||
                        (!data.acceptPropagatedEvent && event.target != this)){ 
                        return false; 
                    }
                    
                    // Initial coordinates will be the last when dragging
                    data.lastCoord = {left: event.clientX, top: event.clientY}; 
                
                    $$.event.add( iframe.contentDocument, "mouseup", 
                                dragscroll.mouseUpHandler, data );
                    $$.event.add( iframe.contentDocument, "mousemove", 
                                dragscroll.mouseMoveHandler, data );
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }
                },
                mouseMoveHandler : function(event) { // User is dragging
                    // How much did the mouse move?
                    var delta = {left: (event.clientX - data.lastCoord.left),
                                top: (event.clientY - data.lastCoord.top)};
                    
                    // Set the scroll position relative to what ever the scroll is now
                    data.scrollable.scrollLeft(
                                    data.scrollable.scrollLeft() - delta.left);
                    data.scrollable.scrollTop(
                                    data.scrollable.scrollTop() - delta.top);
                    
                    // Save where the cursor is
                    data.lastCoord={left: event.clientX, top: event.clientY}
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }
        
                },
                mouseUpHandler : function(event) { // Stop scrolling
                    $$.event.remove( iframe.contentDocument, "mousemove", dragscroll.mouseMoveHandler);
                    $$.event.remove( iframe.contentDocument, "mouseup", dragscroll.mouseUpHandler);
                    if (data.preventDefault) {
                        event.preventDefault();
                        return false;
                    }
                }
            }
            $(iframe.contentDocument).bind('mousedown', dragscroll.mouseDownHandler);
            var zoom = 0.4;
            $(iframe.contentDocument).bind('wheel mousewheel', function(e: any){
                var delta;
        
                if (e.originalEvent.wheelDelta !== undefined)
                    delta = e.originalEvent.wheelDelta;
                else
                    delta = e.originalEvent.deltaY;
                delta = delta / 1000.0;
                zoom += delta;
                var scrollLeft = zoom * e.originalEvent.clientX * 2;
                var scrollTop = zoom * e.originalEvent.clientY * 2;
                $(iframe.contentDocument).scrollLeft(scrollLeft);
                $(iframe.contentDocument).scrollTop(scrollTop);
                $("html", iframe.contentDocument).css("transform", `scale(${zoom})`);
                e.preventDefault();
            });
        }
    }
    
    ngOnDestroy(): void {
        this.settingsSubscription.unsubscribe();
    }

    initialize(geojson, center): void {  
       let projection = d3.geo.mercator().scale(1).translate([0, 0]);
       let path = d3.geo.path().projection(projection);
       let bounds = path.bounds(geojson);

       let scale = .95 / Math.max((bounds[1][0] - bounds[0][0]) / this.width,
            (bounds[1][1] - bounds[0][1]) / this.height);
            
       let transl = [(this.width - scale * (bounds[1][0] + bounds[0][0])) / 2,
            (this.height - scale * (bounds[1][1] + bounds[0][1])) / 2];

       projection.scale(scale).translate(transl);
        
       let svg = d3.select(".svg-container").append("svg").attr("width", this.width).attr("height", this.height);
       let legends = [];
       let symbols = [];

       for(let i=0; i<geojson.features.length; i++){
          let feature = geojson.features[i];
          let indicator = this.bigConfig.filter(e => e.id === feature.indicator)[0];
         
          if(!indicator)
            continue;

          let keys = Object.keys(feature.properties);

          if(keys.length === 0){
             svg.append("path").attr("d", path(feature)).style("fill", "transparent").style("stroke", "steelblue");
             continue;
          }
          
          for(let j=0; j<keys.length; j++){
              let element = indicator.elements.filter(e => e.values[keys[j]] === feature['properties'][keys[j]])[0];
              
              if(!element){
                  svg.append("path").attr("d", path(feature)).style("fill", "transparent").style("stroke", "steelblue");
                  continue;
              }

              let color = 'steelblue';
              let icon = null;

              if(element['style'])
                 color = MapUtils.getStyleColor(element['style'], '#ffffff');
              
              if(feature['properties']['icon']){
                  let project = projection([center[0], center[1]]);
                  
                  let marker = base64Img.base64Sync(ospath.join(__dirname, 'assets\\markers\\' + feature['properties']['icon']));

                  svg.append("svg:image").attr('class','mark')
                    .attr('width', 10)
                    .attr('height', 10)
                    .attr("xlink:href", marker)
                    .attr("x", projection(center)[0])
                    .attr("y", projection(center)[1])
           
                  svg.append("path")
                    .attr("d", path(feature)).style("fill", color === 'steelblue' ? 'transparent' : color)
                    .style("stroke", color);
                 
                 let attribute = null;

                 if(keys[j] === 'amenity') {
                     attribute = element.attributes.filter(e => e.key === 'isced')[0];
                 }
                 
                 if(attribute){
                    let value = attribute.key;
                    let label = attribute.label;
            
                    if(attribute['options']){
                        let attributeOption = attribute.options.filter(e => e.marker === feature['properties']['icon'])[0];

                        if(attributeOption){
                            value = attributeOption.value;
                            label = attributeOption.label;
                        }
                    }

                    let existingElement = symbols.filter(e => e.value === value)[0];

                    if(!existingElement)
                        symbols.push({"value": value, "label": label, "marker": marker });
                 }
                 
                 continue;
              }
                
              if(!element || !element['style']){
                  svg.append("path").attr("d", path(feature)).style("fill", "transparent").style("stroke", "steelblue");
                  continue;
              }

              let dashArray = element['style']['dashArray'] ? element['style']['dashArray'] : null;

              if(indicator.id == 'network_transportation'){
                svg.append("path").attr("d", path(feature)).style("fill", "transparent").style("stroke", color).style("stroke-dasharray", dashArray);
              } 
              else{
                svg.append("path").attr("d", path(feature)).style("fill", color).style("stroke", color);
              }

              let existingElement = legends.filter(e => e.value === element.values[keys[j]])[0];

              if(!existingElement)
                 legends.push({"value": element.values[keys[j]], "label": element.label, "color": color});
          }
       }

       this.dataApiService.getDesa(false).subscribe(result => {
            let desa = result;
            let templatePath = ospath.join(__dirname, 'templates\\peta_preview\\landuse.html');
            let template = fs.readFileSync(templatePath,'utf8');
            let tempFunc = dot.template(template);
            
            let skalaImg = base64Img.base64Sync(ospath.join(__dirname, 'templates\\peta_preview\\skala.png'));
            let petaSkalaImg = base64Img.base64Sync(ospath.join(__dirname, 'templates\\peta_preview\\peta-skala.png'));

            this.html = tempFunc({"svg": svg[0][0].outerHTML, 
                                  "legends": legends, 
                                  "symbols": symbols,
                                  "skala": skalaImg, 
                                  "petaSkala": petaSkalaImg, 
                                  "desa": desa, 
                                  "logo": this.settings.logo});
            
            this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(this.html);
            setTimeout(() => {
                this.initDragZoom();
            }, 0);
       });
    }

    print(): void {
        let fileName = remote.dialog.showSaveDialog({
            filters: [{name: 'Peta Desa', extensions: ['pdf']}]
        });

        let options = { 
            "format": "A1", 
            "orientation": "landscape", 
            "type": "pdf",
            "quality": "75" 
        }

        if(fileName){
            temp.open("sidekahtml", (err, info) => {
                fs.writeFileSync(info.path, this.html);
                let tmpUrl = fileUrl(info.path);
                let win = new remote.BrowserWindow({show: false});
                win.loadURL(tmpUrl);
                win.webContents.on('did-finish-load', () => {
                    // Use default printing options
                    win.webContents.printToPDF({landscape: true, pageSize:"A3"}, (error, data) => {
                    if (error) throw error
                    fs.writeFile(fileName, data, (error) => {
                        if (error) throw error
                        console.log('Write PDF successfully.')
                        temp.cleanupSync();
                        win.destroy();
                        shell.openItem(fileName);
                    })
                    })
                });
            });
            //win.loadURL('data:text/html;charset=utf-8,'+this.html);
        }
    }
}
