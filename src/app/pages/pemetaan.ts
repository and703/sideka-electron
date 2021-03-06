import { Component, ApplicationRef, ViewChild, ComponentRef, ViewContainerRef, ComponentFactoryResolver, Injector, OnInit, OnDestroy } from "@angular/core";
import { Router } from '@angular/router';
import { remote, clipboard, shell } from "electron";
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';
import { PersistablePage } from '../pages/persistablePage';
import { SchemaDict } from "../schemas/schema";

import * as L from 'leaflet';
import * as jetpack from 'fs-jetpack';
import * as uuid from 'uuid';
import * as $ from 'jquery';
import * as fs from 'fs';
import * as shapefile from 'shapefile';

import schemas from '../schemas';
import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';
import SettingsService from '../stores/settingsService';
import titleBar from '../helpers/titleBar';
import MapUtils from '../helpers/mapUtils';
import MapComponent from '../components/map';
import PopupPaneComponent from '../components/popupPane';
import MapPrintComponent from '../components/mapPrint';
import LogPembangunanComponent from '../components/logPembangunan';
import PembangunanComponent from '../components/pembangunan';
import PageSaver from '../helpers/pageSaver';

var base64 = require("uuid-base64");
var rrose = require('../lib/leaflet-rrose/leaflet.rrose-src.js');
var proj4 = require('proj4');

const LONLAT_COORD_SYSTEM = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";

@Component({
    selector: 'pemetaan',
    templateUrl: '../templates/pemetaan.html'
})
export default class PemetaanComponent implements OnInit, OnDestroy, PersistablePage {
    type = "pemetaan";
    subType = null;

    bundleSchemas = schemas.pemetaanBundle;

    progress : Progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
    progressMessage = '';

    indicators  = jetpack.cwd(__dirname).read('bigConfig.json', 'json');

    activePageMenu = null;

    activeLayer = 'Kosong';
    modalSaveId = 'modal-save-diff';

    latitude: number;
    longitude: number;
    selectedIndicator: any;
    selectedUploadedIndicator: any;
    selectedFeature: any;
    selectedDiff: any;
    mapSubscription: Subscription;
    isDataEmpty: boolean;
    selectedFeatureToMove: any;
    oldIndicator: any;
    newIndicator: any;

    viewMode: string;
    crs: string;
    selectedProperties: any;
    selectedEditorType: string;
    selectedRab: any[];
    coordinateSystem: string;
    zone: string;
    region: string;

    pageSaver: PageSaver;
    popupPaneComponent: ComponentRef<PopupPaneComponent>;

    @ViewChild(MapComponent)
    private map: MapComponent

    @ViewChild(MapPrintComponent)
    private mapPrint: MapPrintComponent;

    @ViewChild(LogPembangunanComponent)
    private logPembangunan: LogPembangunanComponent;

    @ViewChild(PembangunanComponent)
    private pembangunan: PembangunanComponent;
    
    constructor(
        public dataApiService: DataApiService,
        public sharedService: SharedService,
        public router: Router,
        public toastr: ToastsManager,
        private resolver: ComponentFactoryResolver,
        private injector: Injector,
        private appRef: ApplicationRef,
        private vcr: ViewContainerRef
    ) {
        this.toastr.setRootViewContainerRef(vcr);
        this.pageSaver = new PageSaver(this);

        for (let i = 0; i < this.indicators.length; i++) {
            let indicator = this.indicators[i];
            this.pageSaver.bundleData[indicator.id] = [];
        }

        this.pageSaver.bundleData['log_pembangunan'] = [];
    }

    ngOnInit(): void {
        titleBar.title("Data Pemetaan - " + this.dataApiService.auth.desa_name);
        titleBar.blue();

        this.coordinateSystem = 'lonlat';
        this.region = null;
        this.zone = null;

        this.selectedIndicator = this.indicators[0];
        this.crs = '4326';
        this.activeLayer = 'Kosong';
        this.viewMode = 'map';
        this.selectedDiff = this.indicators[0];

        document.addEventListener('keyup', this.keyupListener, false);
        window.addEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);

        setTimeout(() => {
            this.pageSaver.getContent( result => {
                this.map.setMapData(result['data']);
                this.setCenter(result['data']);
                this.map.setMap();

                setTimeout(() => {
                    this.logPembangunan.setData(result['data']['log_pembangunan'] ? result['data']['log_pembangunan'] : []);
                }, 200);
                
                this.pageSaver.bundleData = result['data'];
                this.checkMapData();
            });
        }, 100);
    }

    ngOnDestroy(): void {
        if(this.mapSubscription)
            this.mapSubscription.unsubscribe();
        
      
        document.removeEventListener('keyup', this.keyupListener, false);
        window.removeEventListener("beforeunload", this.pageSaver.beforeUnloadListener, false);
        titleBar.removeTitle();
    }

    setActiveLayer(layer): boolean {
        if(this.activeLayer === layer)
            return false;
    
        if(layer === 'Kosong'){
            if(this.activeLayer && this.activeLayer !== 'Kosong')
                this.map.removeLayer(this.activeLayer);
        }
        else {
            if(this.activeLayer !== 'Kosong')
                this.map.removeLayer(this.activeLayer);

            this.map.setLayer(layer);
        }

        this.activeLayer = layer;
        return false;
    }

    setActivePageMenu(activePageMenu){
        this.activePageMenu = activePageMenu;

        if (activePageMenu) {
            titleBar.normal();
        } else {
            titleBar.blue();
        }
    }

    recenter(): void {
        this.map.map.setView(this.map.geoJSONLayer.getBounds().getCenter(), 14);
    }

    openMoveFeatureModal(feature): void {
        this.selectedFeatureToMove = feature;
        this.oldIndicator = this.selectedIndicator;

        $('#modal-move-feature')['modal']('show');
    }

    moveFeatureToIndicator(): void {
        if(this.oldIndicator.id === this.newIndicator.id){
            this.toastr.error('Tidak dapat menambahkan feature ke indikator saat ini');
            return;
        }

        let featureInIndicator = this.map.mapData[this.oldIndicator.id].filter(e => e.id === this.selectedFeatureToMove.id)[0];

        if(!featureInIndicator){
            this.toastr.error('Feature tidak ditemukan');
            return;
        }

        let featureInIndicatorIdx = this.map.mapData[this.oldIndicator.id].indexOf(featureInIndicator);

        if(featureInIndicatorIdx > -1){
            this.map.mapData[this.oldIndicator.id].splice(featureInIndicatorIdx, 1);
            this.map.mapData[this.newIndicator.id].push(this.selectedFeatureToMove);
            this.map.setMap();
        }

        this.newIndicator = null;
        $('#modal-move-feature')['modal']('hide');
    }

    saveContent(): void {
        $('#modal-save-diff')['modal']('hide');
       
        this.pageSaver.bundleData = this.map.mapData;
        this.pageSaver.bundleData['log_pembangunan'] = this.logPembangunan.getData();

        this.progressMessage = 'Menyimpan Data';

        this.pageSaver.saveContent(true, result => {
            this.map.setMapData(result['data']);
            this.map.center = this.map.geoJSONLayer.getBounds().getCenter();
            this.setCenter(result['data']);

            if(this.selectedIndicator)
                this.map.setMap(false);
        });
    }

    checkMapData(): void {
        this.isDataEmpty = true;

        for(let i=0; i<this.indicators.length; i++){
            let indicator = this.indicators[i];

            if(!this.map.mapData || !this.map.mapData[indicator.id])
                continue;

            if(this.map.mapData[indicator.id].length > 0){
                this.isDataEmpty = false;
                break;
            }
        }
    }

    getCurrentUnsavedData(): any {
        let currentData = this.map.mapData;

        if(this.pageSaver.bundleData['log_pembangunan'])
            currentData['log_pembangunan'] = this.pageSaver.bundleData['log_pembangunan'];

        return currentData;
    }

    openImportDialog(): void {
        $('#file-upload')[0]['value'] = "";

        $('#modal-import-map')['modal']('show');
    }

    changeIndicator(indicator): void {
        this.viewMode = 'map';
        this.selectedIndicator = indicator;
        this.selectedUploadedIndicator = indicator;
        this.map.indicator = indicator;
        this.map.clearMap();
        this.map.loadGeoJson();
        this.map.setupLegend();
        
        let currentCenter = this.map.map.getCenter();

        if(currentCenter.lat === 0 && currentCenter.lng === 0)
            this.setCenter(this.pageSaver.bundleData);

        if(this.map.mapData[indicator.id].length === 0)
           this.toastr.warning('Data tidak tersedia, silahkan upload data');
    }

    changeLogPembangunan(): void {
        this.selectedIndicator = null;
        this.viewMode = 'logPembangunan';
    }

    setCenter(bundleData): void {
        if(!this.map.geoJSONLayer) 
            this.map.setMap(true);
        else
            this.map.center = this.map.geoJSONLayer.getBounds().getCenter();
    }

    selectFeature(feature) {
        this.selectedFeature = feature;
        this.configurePopupPane(feature);
    }

    selectFeatureFromDropdown(feature: L.Layer) {
        feature.fireEvent('click');
        return false;
    }

    configurePopupPane(feature): void {
        let popup: L.Popup = new rrose({ offset: new L.Point(0, 10), closeButton: false, autoPan: false });
        popup.setLatLng(feature);

        if(this.popupPaneComponent)
            this.popupPaneComponent.destroy();

        const compFactory = this.resolver.resolveComponentFactory(PopupPaneComponent);

        this.popupPaneComponent = compFactory.create(this.injector);

        this.popupPaneComponent.instance['selectedIndicator'] = this.selectedIndicator;
        this.popupPaneComponent.instance['selectedFeature'] = this.selectedFeature;
        this.popupPaneComponent.instance['map'] = this.map.map;
        
        this.popupPaneComponent.instance.onDeleteFeature.subscribe(
            v => { this.deleteFeature(v) }
        );

        this.popupPaneComponent.instance.onEditFeature.subscribe(
            v => { this.map.updateLegend(); }
        );

        this.popupPaneComponent.instance.onDevelopFeature.subscribe(
            v => { this.onDevelopFeature(v); }
        )

        this.popupPaneComponent.instance.onFeatureMove.subscribe(
            v => { this.openMoveFeatureModal(v); }
        );

        this.popupPaneComponent.instance.addMarker.subscribe(
            marker => { this.map.addMarker(marker) }
        );

        if (this.appRef['attachView']) {
            this.appRef['attachView'](this.popupPaneComponent.hostView);

            this.popupPaneComponent.onDestroy(() => {
                this.appRef['detachView'](this.popupPaneComponent.hostView);
            });
        }

        else {
            this.appRef['registerChangeDetector'](this.popupPaneComponent.changeDetectorRef);

            this.popupPaneComponent.onDestroy(() => {
                this.appRef['unregisterChangeDetector'](this.popupPaneComponent.changeDetectorRef);
            });
        }

        let div = document.createElement('div');
        div.appendChild(this.popupPaneComponent.location.nativeElement);
        popup.setContent(div);
      
        popup.on("remove", () => {
            this.selectedFeature = null;
        });

        this.selectedFeature.bindPopup(popup);
    }

    onFileUploadChange(event): void {
        if (!this.selectedUploadedIndicator) {
            this.toastr.error('Indikator tidak ditemukan');
            return;
        }

        if (event.target.files.length === 0)
            return;
        
        this.selectedUploadedIndicator['path'] = event.target.files[0].path;
    }

    onDevelopFeature(feature): void {
        this.pembangunan.feature = feature;
        this.pembangunan.pembangunanData = this.logPembangunan.getDataByFeatureId(feature.feature.id);
        this.pembangunan.initialize();

        $('#modal-pembangunan')['modal']('show');
    }

    onSavePembangunan(data): void {
        let pembangunanData = data.pembangunan;
        let newFeature = data.feature;

        this.selectedFeature.feature.properties = newFeature.properties;
        this.logPembangunan.pushData(pembangunanData);

        this.toastr.success('Feature berhasil dibangun');
        $('#modal-pembangunan')['modal']('hide');
    }

    importContent() {
         this.isDataEmpty = false;

         if(!this.selectedUploadedIndicator){
             this.toastr.error('Tidak ada indikator yang dipilih');
             return;
         }
         
         if(!this.selectedUploadedIndicator['path']){
             this.toastr.error('Tidak ada file yang dipilih');
             return;
         }

         let me = this;

         setTimeout(function() {
             let path = me.selectedUploadedIndicator['path'];
             let segementedPath = path.split('.');
             let extension = segementedPath[segementedPath.length - 1];
             let file = null;

             if(extension === 'shp'){
                 let convertedData = [];
               
                 shapefile.open(path).then(source => source.read().then(function log(result) {
                    if (result.done) {
                        me.onImportComplete(convertedData);
                        return;
                    }

                    let normalizedCoordinates = me.normalizeCoordinateSystem(result.value.geometry.coordinates, result.value.geometry.type);
                    result.value.geometry.coordinates = normalizedCoordinates;
                    convertedData.push(result.value);
                    return source.read().then(log);
                 }));
             }
             else {
                file = jetpack.read(me.selectedUploadedIndicator['path']);

                if(!file){
                    me.toastr.error('File tidak ditemukan');
                    delete me.selectedUploadedIndicator['path'];
                    return;
                }
                
                me.onImportComplete(JSON.parse(file));
             }
         }, 200);
    }

    normalizeCoordinateSystem(coordinates, type): any {
        let results = [];
        let from = LONLAT_COORD_SYSTEM;

        if(this.coordinateSystem === 'utm'){
            
            if(!this.zone) {
                this.toastr.info('Zona harus diisi untuk sistem koordinat UTM');
                return;
            }

            if(!this.region) {
                this.toastr.info('Regional harus diisi untuk sistem koordinat UTM');
                return;
            }

            from = '+proj=utm +zone=' + this.zone + ' +' + this.region + ' +ellps=WGS84 +datum=WGS84 +units=m +no_defs'
        }
          
        let to = LONLAT_COORD_SYSTEM;
        let conversionNeeded = false;

        if(from !== to)
            conversionNeeded = true;

        if(!conversionNeeded)
            return coordinates;
        
        if(type === 'LineString') {
            for(let i=0; i<coordinates.length; i++) {
                 let coordinate = coordinates[i];
                 let result = proj4(from, to, coordinate);
                 results.push(result);
            }
        }
        else if(type === 'Polygon') {
            for(let i=0; i<coordinates.length; i++) {
                let result = [];

                for(let j=0; j<coordinates[i].length; j++) {
                    let coordinate = coordinates[i][j];
                    result.push(proj4(from, to, coordinate));
                }

                results.push(result);
            }
        }

        else if(type === 'MultiPolygon') {
             for(let i=0; i<coordinates.length; i++) {
                let result = [];

                for(let j=0; j<coordinates[i].length; j++) {
                    let subCoordinateResult = [];

                    for(let k=0; k<coordinates[i][j].length; k++) {
                        let coordinate = coordinates[i][j][k];
                        subCoordinateResult.push(proj4(from, to, coordinate));
                    }

                    result.push(subCoordinateResult);
                }

                results.push(result);
             }
        }

        else if(type === 'Point') {
           let coordinate = proj4(from, to, coordinates);
           
           for(let i=0; i<coordinate.length; i++) 
              results.push(coordinate[i]);
        }

        console.log(results);
        return results;
    }

    onImportComplete(data): void {
        this.importData(data,  this.selectedUploadedIndicator.id);
        this.selectedUploadedIndicator['path'] = null;
        this.changeIndicator(this.selectedUploadedIndicator);
        $('#modal-import-map')['modal']('hide');
        this.coordinateSystem = 'lonlat';
        this.zone = null;
        this.region = null;
        this.toastr.success('Data berhasil diimpor');
    }

    importData(jsonData, indicatorId): void {
        let result = [];

        if(jsonData.type === 'FeatureCollection'){
            for(let i=0; i<jsonData.features.length; i++){
                let feature = jsonData.features[i];
                feature['id'] = base64.encode(uuid.v4());
                feature['properties'] = {};
                result.push(feature);
            }
        }
        else if(jsonData instanceof Array) {
            for(let i=0; i<jsonData.length; i++) {
                let feature = jsonData[i];
                feature['id'] = base64.encode(uuid.v4());
                feature['properties'] = {};
                result.push(feature);
            }
        }
        else {
            let feature = jsonData;
            feature['id'] = base64.encode(uuid.v4());
            feature['properties'] = {};
            result.push(feature);
        }

        this.map.mapData[indicatorId] = this.map.mapData[indicatorId].concat(result);
        this.pageSaver.bundleData[indicatorId] = this.map.mapData[indicatorId];
        this.map.setMap(true);
    }

    delete(): void {
        let dialog = remote.dialog;
        let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
            type: 'question',
            buttons: ['Batal', 'Hapus'],
            title: 'Hapus Feature',
            message: 'Semua feature pada indikator ' + this.selectedIndicator.label + ' ini akan dihapus, anda yakin?'
        });

        if (choice == 0)
            return;

        if(!this.selectedIndicator){
            this.toastr.error('Tidak ada indikator yang dipilih');
            return;
        }

        this.map.mapData[this.selectedIndicator.id] = [];
        this.map.setMap(false);
    }

    deleteFeature(id): void {
        let dialog = remote.dialog;
        let choice = dialog.showMessageBox(remote.getCurrentWindow(),
            {
                type: 'question',
                buttons: ['Batal', 'Hapus'],
                title: 'Hapus Feature',
                message: 'Feature ini akan dihapus, anda yakin?'
            });

        if (choice == 0)
            return;
        
        let feature = this.map.mapData[this.selectedIndicator.id].filter(e => e.id === id)[0];

        if(!feature){
            this.toastr.error("Feature tidak ditemukan");
            return;
        }

        let index = this.map.mapData[this.selectedIndicator.id].indexOf(feature);
        this.map.mapData[this.selectedIndicator.id].splice(index, 1);
        this.map.setMap(false);
    }

    printMap(): void {
       this.setActivePageMenu("print");

       let printedGeoJson = MapUtils.createGeoJson();
 
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['waters']);
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['boundary']);
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['landuse']);
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['network_transportation']);
       printedGeoJson.features = printedGeoJson.features.concat(this.map.mapData['facilities_infrastructures']);
       

       this.mapPrint.initialize(printedGeoJson, L.geoJSON(printedGeoJson).getBounds().getCenter());
    }

    doPrint(): boolean {
        this.mapPrint.print();
        return false;
    }

    showPemetaan(): void {
        titleBar.title("Data Pemetaan - " + this.dataApiService.auth.desa_name);
        titleBar.blue();
    }

    progressListener(progress: Progress) {
        this.progress = progress;
    }

    keyupListener = (e) => {
        let handled = false;
        // Ctrl+s
        if (e.ctrlKey && e.keyCode === 83) {
            if(this.dataApiService.auth.isAllowedToEdit("pemetaan")){
                this.pageSaver.onBeforeSave();
                handled = true;
            }
        }
        // Ctrl+p
        else if (e.ctrlKey && e.keyCode === 80) {
            this.printMap();
            handled = true;
        }
        else if(e.ctrlKey && e.target && e.target.className == "copyPaste"){
            if(e.keyCode == 88 || e.keyCode == 67 || e.keyCode == 86)
                handled = true;
            if(e.keyCode == 88)
                this.cut();
            else if(e.keyCode == 67)
                this.copy();
            else if(e.keyCode == 86)
                this.paste();
        }
        if(handled){
            e.preventDefault();
            e.stopPropagation();
        }
    }

    cut(): void {
        if(this.selectedFeature){
            clipboard.writeText(JSON.stringify(this.selectedFeature.toGeoJSON(), null, 4));

            let index = this.map.mapData[this.selectedIndicator.id].indexOf(this.selectedFeature.feature);
            this.map.mapData[this.selectedIndicator.id].splice(index, 1);
            this.map.setMap(true);

            this.selectedFeature = null;
        }
    }

    copy(): void {
        if(this.selectedFeature){
            clipboard.writeText(JSON.stringify(this.selectedFeature.toGeoJSON(), null, 4));
        }
    }

    paste(): void {
        var json = clipboard.readText();
        try {
            var data = JSON.parse(json);
            this.importData(data, this.selectedIndicator.id);
        } catch (ex){
            console.log(ex);
        }
        if(data){
        }
    }

    viewDataFromHotColumn(data): void {
        if(data.type === 'properties') {
            let properties = data.atCurrentRow[data.col];
            let old = properties;
            let keys = Object.keys(old);

            this.selectedProperties = [];

            for(let i=0; i<keys.length; i++){
                let key = keys[i];
                let value = old[keys[i]];

                this.selectedProperties.push({ key: key, value: value });
            }
            
            this.selectedEditorType = data.col == 5 ? 'old' : 'new';

            $('#modal-view-properties')['modal']('show');
        }
        else {
            this.selectedRab = data.atCurrentRow[data.col];
            $('#modal-view-rab')['modal']('show');
        }
    }

    bindMarker(marker): void {
        marker.addTo(this.map.map);
    }

    addMarker(marker): void {
        this.map.addMarker(marker);
    }

    updateLegend(): void {
        this.map.updateLegend();
    }

    removeMarker(marker): void {
        this.map.removeLayer(marker);
    }

    async openGeojsonIo(){
        var center = null;
        try {
            center = this.map.geoJSONLayer.getBounds().getCenter();
            if(!center || (!center[0] && !center[1])){
                var desa = await this.dataApiService.getDesa(false).first().toPromise();
                center = [desa.longitude, desa.latitude];
            }
        } catch(e){}

        if(!center)
            center = [0,0];

        shell.openExternal(`http://geojson.io/#map=17/${center[1]}/${center[0]}`);
    }
}
