import {
  AlertController,
  ModalController,
  Platform,
  ScrollDetail,
} from '@ionic/angular';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import BeanconquerorSettingsDummy from '../../assets/BeanconquerorTestData.json';
import { Bean } from '../../classes/bean/bean';

import { Brew } from '../../classes/brew/brew';
import { BREW_VIEW_ENUM } from '../../enums/settings/brewView';
import { ChangeDetectorRef, Component } from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { IBean } from '../../interfaces/bean/iBean';
import { IBrew } from '../../interfaces/brew/iBrew';
import { ISettings } from '../../interfaces/settings/iSettings';
import { Mill } from '../../classes/mill/mill';
import { Settings } from '../../classes/settings/settings';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { STARTUP_VIEW_ENUM } from '../../enums/settings/startupView';
import { Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIHelper } from '../../services/uiHelper';
import { UILog } from '../../services/uiLog';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIStorage } from '../../services/uiStorage';

/** Third party */
import { AnalyticsPopoverComponent } from '../../popover/analytics-popover/analytics-popover.component';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';

import { CurrencyService } from '../../services/currencyService/currency.service';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { IGreenBean } from '../../interfaces/green-bean/iGreenBean';
import { IMill } from '../../interfaces/mill/iMill';
import { IPreparation } from '../../interfaces/preparation/iPreparation';
import { IRoastingMachine } from '../../interfaces/roasting-machine/iRoastingMachine';
import moment from 'moment';
import { Preparation } from '../../classes/preparation/preparation';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';
import SETTINGS_TRACKING from '../../data/tracking/settingsTracking';
import { UIExcel } from '../../services/uiExcel';
import { UIGreenBeanStorage } from '../../services/uiGreenBeanStorage';
import { UIHealthKit } from '../../services/uiHealthKit';
import { UIRoastingMachineStorage } from '../../services/uiRoastingMachineStorage';
import { UIToast } from '../../services/uiToast';
import { UIUpdate } from '../../services/uiUpdate';
import { UiVersionStorage } from '../../services/uiVersionStorage';
import { UIWaterStorage } from '../../services/uiWaterStorage';
import { Water } from '../../classes/water/water';
import { AppEvent } from '../../classes/appEvent/appEvent';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { EventQueueService } from '../../services/queueService/queue-service.service';
import { CoffeeBluetoothDevicesService } from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { Logger } from '../../classes/devices/common/logger';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIExportImportHelper } from '../../services/uiExportImportHelper';
import { BluetoothTypes } from '../../classes/devices';
import { VISUALIZER_SERVER_ENUM } from '../../enums/settings/visualizerServer';
import { VisualizerService } from '../../services/visualizerService/visualizer-service.service';
import { UIGraphStorage } from '../../services/uiGraphStorage.service';
import { Graph } from '../../classes/graph/graph';
import { TextToSpeechService } from '../../services/textToSpeech/text-to-speech.service';
import { PreparationDeviceType } from '../../classes/preparationDevice';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { BluetoothDeviceChooserPopoverComponent } from '../../popover/bluetooth-device-chooser-popover/bluetooth-device-chooser-popover.component';
import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';

declare var window: any;
declare var FilePicker;

@Component({
  selector: 'settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage {
  public settings: Settings;

  public BREW_VIEWS = BREW_VIEW_ENUM;
  public STARTUP_VIEW = STARTUP_VIEW_ENUM;
  public debounceLanguageFilter: Subject<string> = new Subject<string>();

  public isHealthSectionAvailable: boolean = false;
  public isTextToSpeechSectionAvailable: boolean = false;

  public currencies = {};

  public settings_segment: string = 'general';

  public visualizerServerEnum = VISUALIZER_SERVER_ENUM;

  public isScrolling: boolean = false;

  private __cleanupAttachmentData(
    _data: Array<
      IBean | IBrew | IMill | IPreparation | IGreenBean | IRoastingMachine
    >
  ): any {
    if (_data !== undefined && _data.length > 0) {
      for (const obj of _data) {
        obj.attachments = [];
      }
    }
  }

  private __cleanupImportSettingsData(_data: ISettings | any): void {
    // We need to remove the filter because of new data here.
    if (_data !== undefined) {
      _data.brew_filter = {};
      _data.brew_filter.ARCHIVED = this.settings.GET_BREW_FILTER();
      _data.brew_filter.OPEN = this.settings.GET_BREW_FILTER();

      _data.bean_filter = {};
      _data.bean_filter.OPEN = this.settings.GET_BEAN_FILTER();
      _data.bean_filter.ARCHIVED = this.settings.GET_BEAN_FILTER();
    }
  }

  constructor(
    private readonly platform: Platform,
    public uiSettingsStorage: UISettingsStorage,
    public uiStorage: UIStorage,
    public uiHelper: UIHelper,
    private readonly fileChooser: FileChooser,
    private readonly alertCtrl: AlertController,
    private readonly uiAlert: UIAlert,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly socialSharing: SocialSharing,
    private readonly uiLog: UILog,
    private readonly translate: TranslateService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly uiAnalytics: UIAnalytics,
    private readonly androidPermissions: AndroidPermissions,
    private readonly uiUpdate: UIUpdate,
    private readonly uiVersionStorage: UiVersionStorage,
    private readonly uiExcel: UIExcel,
    private readonly uiHealthKit: UIHealthKit,
    private readonly modalCtrl: ModalController,
    private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
    private readonly uiGreenBeanStorage: UIGreenBeanStorage,
    private readonly uiWaterStorage: UIWaterStorage,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly uiToast: UIToast,
    private readonly currencyService: CurrencyService,
    private readonly eventQueue: EventQueueService,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiExportImportHelper: UIExportImportHelper,
    private readonly visualizerService: VisualizerService,
    private readonly textToSpeech: TextToSpeechService
  ) {
    this.__initializeSettings();
    this.debounceLanguageFilter
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.setLanguage();
      });

    this.currencies = this.currencyService.getCurrencies();

    this.uiHealthKit.isAvailable().then(
      () => {
        this.isHealthSectionAvailable = true;
      },
      () => {
        this.isHealthSectionAvailable = false;
      }
    );

    if (this.platform.is('ios')) {
      this.isTextToSpeechSectionAvailable = true;
    } else {
      this.isTextToSpeechSectionAvailable = false;
    }
  }

  public handleScrollStart() {
    this.isScrolling = true;
  }

  public handleScroll(ev: CustomEvent<ScrollDetail>) {
    this.isScrolling = true;
  }

  public handleScrollEnd() {
    setTimeout(() => {
      this.isScrolling = false;
    }, 1000);
  }

  private async showBluetoothPopover(_type: BluetoothTypes) {
    const modal = await this.modalCtrl.create({
      component: BluetoothDeviceChooserPopoverComponent,
      id: BluetoothDeviceChooserPopoverComponent.POPOVER_ID,
      componentProps: { bluetoothTypeSearch: _type },
    });
    await modal.present();
    await modal.onWillDismiss();
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async findAndConnectRefractometerDevice(_retry: boolean = false) {
    this.showBluetoothPopover(BluetoothTypes.TDS);
  }

  public async findAndConnectTemperatureDevice(_retry: boolean = false) {
    this.showBluetoothPopover(BluetoothTypes.TEMPERATURE);
  }

  public async findAndConnectPressureDevice(_retry: boolean = false) {
    this.showBluetoothPopover(BluetoothTypes.PRESSURE);
  }

  public async findAndConnectScale(_retry: boolean = false) {
    this.showBluetoothPopover(BluetoothTypes.SCALE);
  }

  public async disconnectDevice(_type: BluetoothTypes) {
    /** Its true, because we try to disconnect, and if this is not possible, we just still forgot the device**/
    let disconnected: boolean = true;

    if (_type === BluetoothTypes.SCALE) {
      this.eventQueue.dispatch(
        new AppEvent(AppEventType.BLUETOOTH_SCALE_DISCONNECT, undefined)
      );
      if (this.settings.scale_id !== '' && this.bleManager.getScale()) {
        disconnected = await this.bleManager.disconnect(this.settings.scale_id);
      }
      if (disconnected) {
        this.settings.scale_id = '';
        this.settings.scale_type = null;
      }
    } else if (_type === BluetoothTypes.PRESSURE) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_PRESSURE_DEVICE_DISCONNECT,
          undefined
        )
      );
      if (
        this.settings.pressure_id !== '' &&
        this.bleManager.getPressureDevice()
      ) {
        disconnected = await this.bleManager.disconnectPressureDevice(
          this.settings.pressure_id
        );
      }

      if (disconnected) {
        this.settings.pressure_id = '';
        this.settings.pressure_type = null;
      }
    } else if (_type === BluetoothTypes.TEMPERATURE) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_TEMPERATURE_DEVICE_DISCONNECT,
          undefined
        )
      );
      if (
        this.settings.temperature_id !== '' &&
        this.bleManager.getTemperatureDevice()
      ) {
        disconnected = await this.bleManager.disconnectTemperatureDevice(
          this.settings.temperature_id
        );
      }

      if (disconnected) {
        this.settings.temperature_id = '';
        this.settings.temperature_type = null;
      }
    } else if (_type === BluetoothTypes.TDS) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_REFRACTOMETER_DEVICE_DISCONNECT,
          undefined
        )
      );

      if (
        this.settings.refractometer_id !== '' &&
        this.bleManager.getRefractometerDevice()
      ) {
        disconnected = await this.bleManager.disconnectRefractometerDevice(
          this.settings.refractometer_id
        );
      }

      if (disconnected) {
        this.settings.refractometer_id = '';
        this.settings.refractometer_type = null;
      }
    }

    if (disconnected) {
      await this.saveSettings();
    }
  }

  public async checkWaterSection() {
    if (this.settings.show_water_section === false) {
      await this.uiAlert.showLoadingSpinner();
      try {
        this.settings.manage_parameters.water = true;
        await this.saveSettings();

        const preps: Array<Preparation> =
          this.uiPreparationStorage.getAllEntries();
        if (preps.length > 0) {
          for (const prep of preps) {
            prep.manage_parameters.water = true;
            await this.uiPreparationStorage.update(prep);
          }
        }
      } catch (ex) {}

      await this.uiAlert.hideLoadingSpinner();
    }
  }

  public checkHealthPlugin() {
    // #200 - Didn't save the settings
    if (this.settings.track_caffeine_consumption === false) {
      this.uiAlert
        .showConfirm(
          'HEALTH_KIT_QUESTION_MESSAGE',
          'HEALTH_KIT_QUESTION_TITLE',
          true
        )
        .then(
          () => {
            this.uiHealthKit.requestAuthorization().then(
              async () => {
                // Allowed
                this.settings.track_caffeine_consumption = true;
                await this.saveSettings();
              },
              async () => {
                // Forbidden
                this.settings.track_caffeine_consumption = false;
                await this.saveSettings();
              }
            );
          },
          async () => {
            this.settings.track_caffeine_consumption = false;
            await this.saveSettings();
          }
        );
    }
  }

  public async checkCoordinates() {
    // Only ask for permissions when the geolocation feature is turned on and
    // the current platform is android.
    if (!this.settings.track_brew_coordinates || !this.platform.is('android')) {
      return;
    }

    try {
      const currentPermissions = await Geolocation.checkPermissions();
      if (currentPermissions.location === 'granted') {
        this.uiLog.info('Location permission is already granted.');
        return;
      }
      // TODO Capacitor migration: We should also handle the other possible
      // outcomes, see https://capacitorjs.com/docs/plugins/web#aliases
      // At the very least, we should display a message to the user.

      const requestResult = await Geolocation.requestPermissions({
        permissions: ['location'],
      });
      if (requestResult.location !== 'granted') {
        throw new Error(
          'Permission request did not work, maybe the user declined?'
        );
      }
    } catch (error) {
      this.uiLog.warn('Error obtaining location permission:', error);
    }
  }

  public async changeBrewRating() {
    // #379 - First save then reset filter ;)
    await this.saveSettings();
    this.settings.resetFilter();
    setTimeout(() => {
      const newRating = this.settings.brew_rating;

      const allBrewEntries = this.uiBrewStorage.getAllEntries();
      if (allBrewEntries.filter((e) => e.rating > newRating).length > 0) {
        // We have brews which have a higher rating and would be not displayed.
        this.uiAlert.showMessage(
          'PAGE_SETTINGS_BREW_RATING_CHANGED_BREWS_NOT_VISIBLE',
          'CARE',
          'CLOSE',
          true
        );
      }
    }, 500);
  }

  public async changeBeanRating() {
    await this.saveSettings();
    this.settings.resetFilter();
    setTimeout(() => {
      const newRating = this.settings.bean_rating;

      const allBeanEntries = this.uiBeanStorage.getAllEntries();
      if (allBeanEntries.filter((e) => e.rating > newRating).length > 0) {
        // We have brews which have a higher rating and would be not displayed.
        this.uiAlert.showMessage(
          'PAGE_SETTINGS_BEAN_RATING_CHANGED_BEANS_NOT_VISIBLE',
          'CARE',
          'CLOSE',
          true
        );
      }
    }, 500);
  }

  public async saveSettings() {
    this.changeDetectorRef.detectChanges();
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public async visualizerServerHasChanged() {
    if (this.settings.visualizer_server === VISUALIZER_SERVER_ENUM.VISUALIZER) {
      this.settings.visualizer_url = 'https://visualizer.coffee/';
    } else {
      if (!this.settings.visualizer_url.endsWith('/')) {
        this.settings.visualizer_url = this.settings.visualizer_url + '/';
      }
    }
  }

  public async checkVisualizerURL() {
    if (this.settings.visualizer_url === '') {
      this.settings.visualizer_url = 'https://visualizer.coffee/';
    }
    if (!this.settings.visualizer_url.endsWith('/')) {
      this.settings.visualizer_url = this.settings.visualizer_url + '/';
    }
  }

  public testSpeak() {
    this.textToSpeech.readAndSetTTLSettings();
    let speakTestCount: number = 0;
    const testSpeakArray = ['182.5', '28', '1072', '1.2', '0.1', '203.5'];
    const speakTestIntv = setInterval(() => {
      this.textToSpeech.speak(testSpeakArray[speakTestCount]);

      speakTestCount = speakTestCount + 1;
      if (speakTestCount > 5) {
        clearInterval(speakTestIntv);
      }
    }, this.settings.text_to_speech_interval_rate);
  }

  public async uploadBrewsToVisualizer() {
    const brewEntries = this.uiBrewStorage.getAllEntries();
    const uploadShots = brewEntries.filter(
      (b) => b.flow_profile && !b.customInformation.visualizer_id
    );
    let couldABrewNotBeUploaded: boolean = false;
    await this.uiAlert.showLoadingSpinner();
    for (const shot of uploadShots) {
      try {
        await this.visualizerService.uploadToVisualizer(shot, false);
      } catch (ex) {
        couldABrewNotBeUploaded = true;
      }
    }

    await this.uiAlert.hideLoadingSpinner();

    if (couldABrewNotBeUploaded) {
      this.uiAlert.showMessage(
        'VISUALIZER.NOT_ALL_SHOTS_UPLOADED',
        undefined,
        undefined,
        true
      );
    } else {
      this.uiAlert.showMessage(
        'VISUALIZER.ALL_SHOTS_UPLOADED',
        undefined,
        undefined,
        true
      );
    }
  }

  public howManyBrewsAreNotUploadedToVisualizer() {
    const brewEntries = this.uiBrewStorage.getAllEntries();
    return brewEntries.filter(
      (b) => b.flow_profile && !b.customInformation.visualizer_id
    ).length;
  }

  public async resetFilter() {
    this.settings.resetFilter();
  }
  public async resetBeanSort() {
    this.settings.resetBeanSort();
  }

  public async fixWeightChangeMinFlowNumber() {
    //We need to trigger this, because the slider sometimes procudes values like 0.60000001, and we need to fix this before saving
    this.settings.bluetooth_scale_espresso_stop_on_no_weight_change_min_flow =
      this.uiHelper.toFixedIfNecessary(
        this.settings
          .bluetooth_scale_espresso_stop_on_no_weight_change_min_flow,
        2
      );
  }

  public async toggleLog() {
    if (
      this.settings.scale_log === true ||
      this.settings.pressure_log === true ||
      this.settings.temperature_log === true ||
      this.settings.refractometer_log === true
    ) {
      Logger.enableLog();
    } else {
      Logger.disableLog();
    }
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public async showAnalyticsInformation() {
    const modal = await this.modalCtrl.create({
      component: AnalyticsPopoverComponent,
      id: AnalyticsPopoverComponent.POPOVER_ID,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public languageChanged(_query): void {
    this.debounceLanguageFilter.next(_query);
  }

  public setLanguage(): void {
    this.translate.setDefaultLang(this.settings.language);
    this.translate.use(this.settings.language);
    this.uiAnalytics.trackEvent(
      SETTINGS_TRACKING.TITLE,
      SETTINGS_TRACKING.ACTIONS.SET_LANGUAGE.CATEGORY,
      this.settings.language
    );
    this.uiSettingsStorage.saveSettings(this.settings);
    moment.locale(this.settings.language);
  }

  public async import(): Promise<void> {
    if (!this.platform.is('cordova')) {
      this.__importDummyData();
      return;
    }

    this.uiAnalytics.trackEvent(
      SETTINGS_TRACKING.TITLE,
      SETTINGS_TRACKING.ACTIONS.IMPORT
    );
    this.uiLog.log('Import real data');

    let fileUri: string;
    if (this.platform.is('android')) {
      fileUri = await this.fileChooser.open();
    } else {
      fileUri = await new Promise((resolve, reject) =>
        FilePicker.pickFile(resolve, reject)
      );
    }

    if (!fileUri) {
      return;
    }
    if (!fileUri.endsWith('.zip') && !fileUri.endsWith('.json')) {
      this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_FORMAT'));
      return;
    }

    // path/uri post-processing
    let directoryUri = fileUri.substring(0, fileUri.lastIndexOf('/'));
    const fileName = fileUri.substring(
      fileUri.lastIndexOf('/') + 1,
      fileUri.length
    );
    if (this.platform.is('ios')) {
      if (directoryUri.indexOf('file://') !== 0) {
        directoryUri = 'file://' + directoryUri;
      }
      fileUri = directoryUri + '/' + fileName;
    } else {
      // Until SAF can be implemented or until we package the addition files
      // into the ZIP file, we just have to always import from the external
      // storage directory, i.e. /sdcard/Android/com.beanconqueror.app/files/
      const result = await Filesystem.getUri({
        path: 'Download/Beanconqueror_export/',
        directory: Directory.External,
      });
      directoryUri = result.uri;
    }

    try {
      // TODO Capacitor migration: Test if this works on iOS
      if (fileUri.endsWith('.zip')) {
        const zipContent = await this.uiFileHelper.readFileAsUint8Array(
          fileUri
        );
        const parsedJSON =
          await this.uiExportImportHelper.getJSONFromZIPArrayBufferContent(
            zipContent
          );
        await this.__importJSON(parsedJSON, directoryUri);
      } else {
        // fileUri.endsWith('.json')
        await this.uiFileHelper.readJSONFile(fileUri);
      }
    } catch (error) {
      this.uiLog.error(
        'Error while importing file',
        fileUri,
        'from directory',
        directoryUri,
        '; Error',
        error
      );
      this.uiAlert.showMessage(
        this.translate.instant('ERROR_ON_FILE_READING') + ` (${error})`
      );
    }
  }

  private async exportAttachments() {
    const exportObjects: Array<any> = [
      ...this.uiBeanStorage.getAllEntries(),
      ...this.uiBrewStorage.getAllEntries(),
      ...this.uiPreparationStorage.getAllEntries(),
      ...this.uiMillStorage.getAllEntries(),
      ...this.uiWaterStorage.getAllEntries(),
      ...this.uiGreenBeanStorage.getAllEntries(),
      ...this.uiRoastingMachineStorage.getAllEntries(),
    ];

    await this._exportAttachments(exportObjects);
  }

  private async exportFlowProfiles() {
    const exportObjects: Array<any> = [...this.uiBrewStorage.getAllEntries()];
    await this._exportFlowProfiles(exportObjects);
  }

  private async exportGraphProfiles() {
    const exportObjects: Array<any> = [...this.uiGraphStorage.getAllEntries()];
    await this._exportGraphProfiles(exportObjects);
  }

  public async export() {
    await this.uiAlert.showLoadingSpinner();

    this.uiAnalytics.trackEvent(
      SETTINGS_TRACKING.TITLE,
      SETTINGS_TRACKING.ACTIONS.EXPORT
    );

    this.uiExportImportHelper.buildExportZIP().then(
      async (_blob) => {
        this.uiLog.log('New zip-export way');

        if (this.platform.is('cordova')) {
          if (this.platform.is('android')) {
            await this.exportAttachments();
            await this.exportFlowProfiles();
            await this.exportGraphProfiles();
          }
        }
        await this.uiFileHelper.exportFile('Beanconqueror.zip', _blob, true);

        await this.uiAlert.hideLoadingSpinner();
      },
      () => {
        // Error
        // Do the old conventional way
        this.uiStorage.export().then(
          (_data) => {
            this.uiLog.log('Old JSON-Export way');
            const isIOS = this.platform.is('ios');
            this.uiHelper
              .exportJSON('Beanconqueror.json', JSON.stringify(_data), isIOS)
              .then(
                async () => {
                  if (this.platform.is('cordova')) {
                    if (this.platform.is('android')) {
                      await this.exportAttachments();
                      await this.exportFlowProfiles();
                      await this.exportGraphProfiles();
                      await this.uiAlert.hideLoadingSpinner();

                      const alert = await this.alertCtrl.create({
                        header: this.translate.instant('DOWNLOADED'),
                        subHeader: this.translate.instant(
                          'FILE_DOWNLOADED_SUCCESSFULLY',
                          { fileName: 'Beanconqueror.json' }
                        ),
                        buttons: ['OK'],
                      });
                      await alert.present();
                    } else {
                      await this.uiAlert.hideLoadingSpinner();
                      // File already downloaded
                      // We don't support image export yet, because
                    }
                  } else {
                    await this.uiAlert.hideLoadingSpinner();
                    // File already downloaded
                    // We don't support image export yet, because
                  }
                },
                async () => {
                  await this.uiAlert.hideLoadingSpinner();
                }
              );
          },
          async () => {
            await this.uiAlert.hideLoadingSpinner();
          }
        );
      }
    );
    return;
  }

  public excelExport(): void {
    this.uiExcel.export();
  }

  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }

  public doWeHaveBrewByWeights(_type: string): boolean {
    const allPreparations = this.uiPreparationStorage.getAllEntries();
    for (const prep of allPreparations) {
      if (
        _type === 'xenia' &&
        prep.connectedPreparationDevice.type === PreparationDeviceType.XENIA
      ) {
        return true;
      } else if (
        _type === 'sanremo' &&
        prep.connectedPreparationDevice.type ===
          PreparationDeviceType.SANREMO_YOU
      ) {
        return true;
      }
    }
  }

  public async exportBrewByWeight(_type: string) {
    await this.uiAlert.showLoadingSpinner();
    try {
      const allPreps = [];
      let allPreparations = this.uiPreparationStorage.getAllEntries();
      // Just take 60, else the excel will be exploding.
      allPreparations = allPreparations.reverse().slice(0, 60);
      for (const prep of allPreparations) {
        if (
          _type === 'xenia' &&
          prep.connectedPreparationDevice.type === PreparationDeviceType.XENIA
        ) {
          allPreps.push(prep);
        } else if (
          _type === 'sanremo' &&
          prep.connectedPreparationDevice.type ===
            PreparationDeviceType.SANREMO_YOU
        ) {
          allPreps.push(prep);
        }
      }

      let allBrewsWithProfiles = [];

      if (_type === 'xenia') {
        allBrewsWithProfiles = this.uiBrewStorage
          .getAllEntries()
          .filter(
            (e) =>
              e.flow_profile !== null &&
              e.flow_profile !== undefined &&
              e.flow_profile !== '' &&
              allPreps.find(
                (pr) => pr.config.uuid === e.method_of_preparation
              ) &&
              e.preparationDeviceBrew &&
              e.preparationDeviceBrew.params &&
              e.preparationDeviceBrew.params.brew_by_weight_active === true
          );
      } else if (_type === 'sanremo') {
        allBrewsWithProfiles = this.uiBrewStorage
          .getAllEntries()
          .filter(
            (e) =>
              e.flow_profile !== null &&
              e.flow_profile !== undefined &&
              e.flow_profile !== '' &&
              allPreps.find(
                (pr) => pr.config.uuid === e.method_of_preparation
              ) &&
              e.preparationDeviceBrew &&
              e.preparationDeviceBrew.params &&
              e.preparationDeviceBrew.params.stopAtWeight > 0
          );
      }

      const allBrewFlows: Array<{ BREW: Brew; FLOW: BrewFlow }> = [];
      for await (const brew of allBrewsWithProfiles) {
        const flow: BrewFlow = await this.readFlowProfile(brew);
        if (flow) {
          allBrewFlows.push({
            BREW: brew,
            FLOW: flow,
          });
        }
      }

      this.uiExcel.exportBrewByWeights(allBrewFlows);
    } catch (ex) {
      this.uiAlert.hideLoadingSpinner();
    }
  }

  public async readFlowProfile(_brew: Brew) {
    const flowProfilePath = 'brews/' + _brew.config.uuid + '_flow_profile.json';
    try {
      const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
        flowProfilePath
      );
      return jsonParsed as BrewFlow;
    } catch (ex) {
      return null;
    }
  }

  public downloadImportExcelTemplates() {
    this.uiHelper.openExternalWebpage(
      'https://beanconqueror.gitbook.io/beanconqueror/resources/files'
    );
  }

  public importBeansExcel(_type: string = 'roasted'): void {
    if (this.platform.is('cordova')) {
      this.uiAnalytics.trackEvent(
        SETTINGS_TRACKING.TITLE,
        SETTINGS_TRACKING.ACTIONS.IMPORT
      );
      this.uiLog.log('Import real data');
      if (this.platform.is('android')) {
        this.fileChooser.open().then(async (uri) => {
          try {
            this.uiFileHelper.readFileAsUint8Array(uri).then(
              async (_arrayBuffer) => {
                if (_type === 'roasted') {
                  this.uiExcel.importBeansByExcel(_arrayBuffer);
                } else {
                  this.uiExcel.importGreenBeansByExcel(_arrayBuffer);
                }
              },
              () => {
                // Backup, maybe it was a .JSON?
              }
            );
          } catch (ex) {
            this.uiAlert.showMessage(
              this.translate.instant('FILE_NOT_FOUND_INFORMATION') +
                ' (' +
                JSON.stringify(ex) +
                ')'
            );
          }
        });
      } else {
        FilePicker.pickFile(
          (uri) => {
            if (uri && uri.endsWith('.xlsx')) {
              let path = uri.substring(0, uri.lastIndexOf('/'));
              const file = uri.substring(uri.lastIndexOf('/') + 1, uri.length);
              if (path.indexOf('file://') !== 0) {
                path = 'file://' + path;
              }
              // TODO Capacitor migration: Check if this works on iOS
              this.uiFileHelper.readFileAsUint8Array(path + '/' + file).then(
                async (_arrayBuffer) => {
                  if (_type === 'roasted') {
                    this.uiExcel.importBeansByExcel(_arrayBuffer);
                  } else {
                    this.uiExcel.importGreenBeansByExcel(_arrayBuffer);
                  }
                },
                () => {
                  // Backup, maybe it was a .JSON?
                }
              );
            } else {
              this.uiAlert.showMessage(
                this.translate.instant('INVALID_FILE_FORMAT')
              );
            }
          },
          () => {}
        );
      }
    } else {
    }
  }

  private async _exportAttachments(
    _storedData:
      | Array<Bean>
      | Array<Brew>
      | Array<Preparation>
      | Array<Mill>
      | Array<GreenBean>
      | Array<RoastingMachine>
      | Array<Water>
  ) {
    for (const entry of _storedData) {
      for (const attachment of entry.attachments) {
        await this._exportFile(attachment);
      }
    }
  }

  private async _exportFlowProfiles(_storedData: Array<Brew>) {
    await this.exportStoredData(_storedData);
  }

  private async _exportGraphProfiles(_storedData: Array<Graph>) {
    await this.exportStoredData(_storedData);
  }

  private async exportStoredData(_storedData: Array<Brew> | Array<Graph>) {
    for (const entry of _storedData) {
      if (entry.flow_profile && entry.flow_profile.length) {
        await this._exportFile(entry.flow_profile);
      }
    }
  }

  private async _exportFile(fileName: string) {
    try {
      const sourceFile = this.uiFileHelper.normalizeFileName(fileName);
      const targetFile = `Download/Beanconqueror_export/${sourceFile}`;
      const targetDirectory = Directory.External;

      await this.uiFileHelper.makeParentDirs(targetFile, targetDirectory);
      const copyResult = await Filesystem.copy({
        from: sourceFile,
        directory: this.uiFileHelper.getDataDirectory(),
        to: targetFile,
        toDirectory: targetDirectory,
      });
      this.uiLog.info(
        'File',
        fileName,
        'exported successfully to',
        copyResult.uri
      );
    } catch (error) {
      this.uiLog.error(
        'Error while exporting',
        fileName,
        error,
        '.The error will be ignored.'
      );
    }
  }

  private async _importFiles(
    _storedData:
      | Bean[]
      | Brew[]
      | Preparation[]
      | Mill[]
      | GreenBean[]
      | RoastingMachine[]
      | Water[],
    _importDirectory: string
  ) {
    for (const entry of _storedData) {
      for (const attachment of entry.attachments) {
        await this._importFile(attachment, _importDirectory);
      }
    }
  }

  private async _importFlowProfileFiles(
    _storedData: Brew[],
    _importDirectory: string
  ) {
    for (const entry of _storedData) {
      if (entry.flow_profile) {
        await this._importFile(entry.flow_profile, _importDirectory);
      }
      if (entry.reference_flow_profile) {
        if (
          entry.reference_flow_profile.type ===
          REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH
        ) {
          /*If we have an imported graph, the uuid, is used with the importedGraph folder, because else we would not been able to store those graphs coming from e.g. visualizer.*/
          /** Making a new object for this seems to be like totaly overdrived **/
          await this._importFile(entry.getGraphPath(), _importDirectory);
        }
      }
    }
  }

  private async _importGraphProfileFiles(
    _storedData: Graph[],
    _importDirectory: string
  ) {
    for (const entry of _storedData) {
      if (entry.flow_profile) {
        await this._importFile(entry.flow_profile, _importDirectory);
      }
    }
  }

  private async _importFile(
    internalPathToImportTo: string,
    importDirectory: string
  ) {
    try {
      internalPathToImportTo = this.uiFileHelper.normalizeFileName(
        internalPathToImportTo
      );

      const fileToImport = importDirectory + '/' + internalPathToImportTo;
      const fileToImportExists = await this.uiFileHelper.fileExists({
        path: fileToImport,
      });
      if (!fileToImportExists) {
        this.uiLog.error(
          'File to import with internal path',
          internalPathToImportTo,
          'does not exist at',
          fileToImport,
          '; Skipping import.'
        );
        // Just give up and try to import the other files
        return;
      }

      this.uiLog.info(
        'Importing to internal path',
        internalPathToImportTo,
        'from',
        fileToImport
      );
      await this.uiFileHelper.makeParentDirsInternal(internalPathToImportTo);
      Filesystem.copy({
        from: fileToImport,
        to: internalPathToImportTo,
        toDirectory: this.uiFileHelper.getDataDirectory(),
      });
    } catch (error) {
      // We never want to throw from this method. We always want to try importing
      // all the other files, so this global catch is important
      this.uiLog.error(
        'Import file error for file',
        internalPathToImportTo,
        'in path',
        importDirectory,
        '; Error:',
        error
      );
    }
  }

  /* tslint:disable */
  private __importDummyData(): void {
    this.uiLog.log('Import dummy data');
    const dummyData = BeanconquerorSettingsDummy;

    if (dummyData.SETTINGS[0]['brew_order']['before'] === undefined) {
      this.uiLog.log('Old brew order structure');
      // Breaking change, we need to throw away the old order types by import
      const settingsConst = new Settings();
      dummyData['SETTINGS'][0]['brew_order'] = this.uiHelper.copyData(
        settingsConst.brew_order
      );
    }
    this.__cleanupImportSettingsData(dummyData['SETTINGS'][0]);

    this.uiStorage.import(dummyData).then(async () => {
      this.__reinitializeStorages().then(async () => {
        this.uiAnalytics.disableTracking();
        this.__initializeSettings();
        this.settings.resetFilter();
        this.setLanguage();
        await this.uiAlert.showMessage(
          this.translate.instant('IMPORT_SUCCESSFULLY')
        );
        if (this.settings.matomo_analytics === undefined) {
          await this.showAnalyticsInformation();
        } else {
          this.uiAnalytics.enableTracking();
        }
      });
    });
  }

  private async __importJSON(_parsedJSON: any, _importDirectory: string) {
    try {
      const parsedContent = _parsedJSON;
      this.uiLog.log('Parsed import data successfully');
      const isIOS: boolean = this.platform.is('ios');
      // Set empty arrays if not existing.
      if (!parsedContent[this.uiPreparationStorage.getDBPath()]) {
        parsedContent[this.uiPreparationStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiBeanStorage.getDBPath()]) {
        parsedContent[this.uiBeanStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiBrewStorage.getDBPath()]) {
        parsedContent[this.uiBrewStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiSettingsStorage.getDBPath()]) {
        parsedContent[this.uiSettingsStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiRoastingMachineStorage.getDBPath()]) {
        parsedContent[this.uiRoastingMachineStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiGreenBeanStorage.getDBPath()]) {
        parsedContent[this.uiGreenBeanStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiWaterStorage.getDBPath()]) {
        parsedContent[this.uiWaterStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiVersionStorage.getDBPath()]) {
        parsedContent[this.uiVersionStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiGraphStorage.getDBPath()]) {
        parsedContent[this.uiGraphStorage.getDBPath()] = [];
      }
      if (
        parsedContent[this.uiPreparationStorage.getDBPath()] &&
        parsedContent[this.uiBeanStorage.getDBPath()] &&
        parsedContent[this.uiBrewStorage.getDBPath()] &&
        parsedContent[this.uiSettingsStorage.getDBPath()]
      ) {
        this.uiLog.log('All data existing');
        this.__cleanupImportSettingsData(
          parsedContent[this.uiSettingsStorage.getDBPath()]
        );

        // When exporting the value is a number, when importing it needs to be  a string.
        parsedContent['SETTINGS'][0]['brew_view'] =
          parsedContent['SETTINGS'][0]['brew_view'] + '';
        this.uiLog.log('Cleaned all data');
        try {
          if (
            !parsedContent['SETTINGS'][0]['brew_order']['before'] === undefined
          ) {
            this.uiLog.log('Old brew order structure');
            // Breaking change, we need to throw away the old order types by import
            const settingsConst = new Settings();
            parsedContent['SETTINGS'][0]['brew_order'] = this.uiHelper.copyData(
              settingsConst.brew_order
            );
          }
        } catch (ex) {
          const settingsConst = new Settings();
          parsedContent['SETTINGS'][0]['brew_order'] = this.uiHelper.copyData(
            settingsConst.brew_order
          );
        }

        await this.uiAlert.showLoadingSpinner();
        this.uiStorage.import(parsedContent).then(
          async (_data) => {
            if (_data.BACKUP === false) {
              this.__reinitializeStorages().then(
                async () => {
                  // Show loadingspinner again, because the reintializestorages hides it.
                  await this.uiAlert.showLoadingSpinner();
                  this.uiAnalytics.disableTracking();
                  this.__initializeSettings();

                  if (!isIOS) {
                    const brewsData = this.uiBrewStorage.getAllEntries();
                    const importAttachmentCollections = [
                      brewsData,
                      this.uiBeanStorage.getAllEntries(),
                      this.uiPreparationStorage.getAllEntries(),
                      this.uiMillStorage.getAllEntries(),
                      this.uiGreenBeanStorage.getAllEntries(),
                      this.uiRoastingMachineStorage.getAllEntries(),
                      this.uiWaterStorage.getAllEntries(),
                    ];

                    for (const collection of importAttachmentCollections) {
                      await this._importFiles(collection, _importDirectory);
                    }

                    await this._importFlowProfileFiles(
                      brewsData,
                      _importDirectory
                    );

                    const graphData = this.uiGraphStorage.getAllEntries();
                    await this._importGraphProfileFiles(
                      graphData,
                      _importDirectory
                    );
                  }

                  if (
                    this.uiBrewStorage.getAllEntries().length > 0 &&
                    this.uiMillStorage.getAllEntries().length <= 0
                  ) {
                    // We got an update and we got no mills yet, therefore we add a Standard mill.
                    const data: Mill = new Mill();
                    data.name = 'Standard';
                    await this.uiMillStorage.add(data);

                    const brews: Array<Brew> =
                      this.uiBrewStorage.getAllEntries();
                    for (const brew of brews) {
                      brew.mill = data.config.uuid;
                      await this.uiBrewStorage.update(brew);
                    }
                  }
                  this.setLanguage();

                  if (
                    this.settings.brew_rating_steps === null ||
                    this.settings.brew_rating_steps === undefined
                  ) {
                    this.settings.brew_rating_steps = 1;
                  }
                  if (
                    this.settings.bean_rating_steps === null ||
                    this.settings.bean_rating_steps === undefined
                  ) {
                    this.settings.bean_rating_steps = 1;
                  }
                  this.settings.resetFilter();
                  await this.uiSettingsStorage.saveSettings(this.settings);
                  await this.uiAlert.hideLoadingSpinner();
                  await this.uiAlert.showMessage(
                    this.translate.instant('IMPORT_SUCCESSFULLY')
                  );
                  if (this.settings.matomo_analytics === undefined) {
                    await this.showAnalyticsInformation();
                  } else {
                    this.uiAnalytics.enableTracking();
                  }
                },
                async () => {
                  await this.uiAlert.hideLoadingSpinner();
                }
              );
            } else {
              await this.uiAlert.hideLoadingSpinner();
              this.uiAlert.showMessage(
                this.translate.instant('IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED')
              );
            }
          },
          async () => {
            await this.uiAlert.hideLoadingSpinner();
            this.uiAlert.showMessage(
              this.translate.instant('IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED')
            );
          }
        );
      } else {
        this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_DATA'));
      }
    } catch (ex) {
      this.uiAlert.showMessage(
        this.translate.instant('INVALID_FILE_DATA') + ' ' + JSON.stringify(ex)
      );
    }
  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  private async __reinitializeStorages(): Promise<any> {
    return new Promise(async (resolve) => {
      await this.uiBeanStorage.reinitializeStorage();
      await this.uiPreparationStorage.reinitializeStorage();
      await this.uiSettingsStorage.reinitializeStorage();
      await this.uiBrewStorage.reinitializeStorage();
      await this.uiMillStorage.reinitializeStorage();
      await this.uiVersionStorage.reinitializeStorage();
      await this.uiGreenBeanStorage.reinitializeStorage();
      await this.uiRoastingMachineStorage.reinitializeStorage();
      await this.uiWaterStorage.reinitializeStorage();
      await this.uiGraphStorage.reinitializeStorage();

      // Wait for every necessary service to be ready before starting the app
      // Settings and version, will create a new object on start, so we need to wait for this in the end.
      const beanStorageReadyCallback = this.uiBeanStorage.storageReady();
      const preparationStorageReadyCallback =
        this.uiPreparationStorage.storageReady();
      const uiSettingsStorageReadyCallback =
        this.uiSettingsStorage.storageReady();
      const brewStorageReadyCallback = this.uiBrewStorage.storageReady();
      const millStorageReadyCallback = this.uiMillStorage.storageReady();
      const versionStorageReadyCallback = this.uiVersionStorage.storageReady();
      const greenBeanStorageCallback = this.uiGreenBeanStorage.storageReady();
      const roastingMachineStorageCallback =
        this.uiRoastingMachineStorage.storageReady();
      const waterStorageCallback = this.uiWaterStorage.storageReady();
      const graphStorageCallback = this.uiGraphStorage.storageReady();

      Promise.all([
        beanStorageReadyCallback,
        preparationStorageReadyCallback,
        brewStorageReadyCallback,
        uiSettingsStorageReadyCallback,
        millStorageReadyCallback,
        versionStorageReadyCallback,
        greenBeanStorageCallback,
        roastingMachineStorageCallback,
        waterStorageCallback,
        graphStorageCallback,
      ]).then(
        async () => {
          await this.uiUpdate.checkUpdate();
          resolve(undefined);
        },
        () => {
          resolve(undefined);
        }
      );
    });
  }

  public async checkVisualizerConnection() {
    if (await this.visualizerService.checkConnection()) {
      this.uiToast.showInfoToastBottom('VISUALIZER.CONNECTION.SUCCESSFULLY');
    } else {
      this.uiAlert.showMessage(
        'VISUALIZER.CONNECTION.UNSUCCESSFULLY',
        undefined,
        undefined,
        true
      );
    }
  }

  protected readonly BluetoothTypes = BluetoothTypes;
}
