import { Injectable, NgZone } from '@angular/core';
import { UIHelper } from '../uiHelper';

import { UILog } from '../uiLog';
import { ServerCommunicationService } from '../serverCommunication/server-communication.service';
import { UIBeanHelper } from '../uiBeanHelper';
import { ServerBean } from '../../models/bean/serverBean';
import { UIAlert } from '../uiAlert';
import QR_TRACKING from '../../data/tracking/qrTracking';
import { UIAnalytics } from '../uiAnalytics';
import { VisualizerService } from '../visualizerService/visualizer-service.service';
import { App, URLOpenListenerEvent } from '@capacitor/app';

declare var window;
@Injectable({
  providedIn: 'root',
})
export class IntentHandlerService {
  public static SUPPORTED_INTENTS = {
    ADD_BEAN_ONLINE: 'ADD_BEAN_ONLINE',
    ADD_USER_BEAN: 'ADD_USER_BEAN',
  };
  constructor(
    private readonly uiHelper: UIHelper,
    private readonly uiLog: UILog,
    private readonly serverCommunicationService: ServerCommunicationService,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiAnalytics: UIAnalytics,
    private readonly visualizerService: VisualizerService,
    private readonly zone: NgZone
  ) {}

  public attachOnHandleOpenUrl() {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.zone.run(() => {
        this.uiLog.log('Deeplink matched ' + JSON.stringify(event));
        this.handleDeepLink(event.url);
      });
    });
  }
  private findGetParameter(_url: string, _parameterName: string) {
    let result = null,
      tmp = [];
    _url.split('&').forEach((item) => {
      tmp = item.split('=');
      if (
        tmp[0] === _parameterName ||
        tmp[0] === _parameterName.replace('=', '')
      ) {
        result = decodeURIComponent(tmp[1]);
      }
    });
    return result;
  }

  private findParameterByCompleteUrl(_url, _parameter) {
    const urlObj: any = new window.URL(_url);
    const val = urlObj.searchParams.get(_parameter);
    return val;
  }

  public async handleQRCodeLink(_url) {
    await this.uiHelper.isBeanconqurorAppReady().then(async () => {
      const url: string = _url;
      this.uiLog.log('Handle QR Code Link: ' + url);
      if (
        url.indexOf('https://beanconqueror.com/?qr=') === 0 ||
        url.indexOf('https://beanconqueror.com?qr=') === 0
      ) {
        this.uiAnalytics.trackEvent(
          QR_TRACKING.TITLE,
          QR_TRACKING.ACTIONS.SCAN
        );
        const qrCodeId: string = String(
          this.findParameterByCompleteUrl(url, 'qr')
        );
        await this.addBeanFromServer(qrCodeId);
      } else {
        this.uiAlert.showMessage(
          'QR.WRONG_QRCODE_DESCRIPTION',
          'QR.WRONG_QRCODE_TITLE',
          undefined,
          true
        );
      }
    });
  }

  public async handleDeepLink(_url) {
    try {
      if (_url) {
        await this.uiHelper.isBeanconqurorAppReady().then(async () => {
          const url: string = _url;

          const urlParams = new URLSearchParams(url.split('?')[1]);

          this.uiLog.log('Handle deeplink: ' + url);
          if (
            url.indexOf('https://beanconqueror.com/?qr=') === 0 ||
            url.indexOf('https://beanconqueror.com?qr=') === 0 ||
            url.indexOf('?qr=') >= 0
          ) {
            const qrCodeId: string = urlParams.get('qr');
            await this.addBeanFromServer(qrCodeId);
          } else if (url.indexOf('beanconqueror://ADD_BEAN_ONLINE?') === 0) {
            const qrCodeId: string = urlParams.get('id');
            await this.addBeanFromServer(qrCodeId);
          } else if (
            url.indexOf('https://beanconqueror.com/?shareUserBean0=') === 0 ||
            url.indexOf('https://beanconqueror.com?shareUserBean0=') === 0 ||
            url.indexOf('?shareUserBean0=') >= 0
          ) {
            let userBeanJSON: string = '';

            const regex = /((shareUserBean)[0-9]+(?=\=))/gi;
            const foundJSONParams = url.match(regex);
            try {
              for (const param of foundJSONParams) {
                userBeanJSON += String(urlParams.get(param));
              }
            } catch (ex) {}
            this.uiLog.log('Found shared bean ' + userBeanJSON);
            if (userBeanJSON) {
              await this.addBeanFromUser(userBeanJSON);
            }
          } else if (url.indexOf('beanconqueror://ADD_USER_BEAN?') === 0) {
            let userBeanJSON: string = '';

            const regex = /((shareUserBean)[0-9]+(?=\=))/gi;
            const foundJSONParams = url.match(regex);
            for (const param of foundJSONParams) {
              userBeanJSON += String(urlParams.get(param));
            }
            if (userBeanJSON) {
              await this.addBeanFromUser(userBeanJSON);
            }
          } else if (url.indexOf('beanconqueror://VISUALIZER_SHARE?') === 0) {
            const visualizerShareCode = String(urlParams.get('code'));

            this.importVisualizerShot(visualizerShareCode);
          } else if (
            url.indexOf('https://beanconqueror.com/?visualizerShare=') === 0 ||
            url.indexOf('https://beanconqueror.com?visualizerShare=') === 0 ||
            url.indexOf('?visualizerShare=') >= 0
          ) {
            const visualizerShareCode = String(
              urlParams.get('visualizerShare')
            );

            this.importVisualizerShot(visualizerShareCode);
          } else {
            this.uiAlert.showMessage(
              'QR.WRONG_LINK_DESCRIPTION',
              'QR.WRONG_LINK_TITLE',
              undefined,
              true
            );
          }
        });
      }
    } catch (ex) {
      if (this.uiAlert.isLoadingSpinnerShown()) {
        this.uiAlert.hideLoadingSpinner();
      }
    }
  }

  private importVisualizerShot(_shareCode) {
    this.visualizerService.importShotWithSharedCode(_shareCode);
  }
  private async addBeanFromServer(_qrCodeId: string) {
    this.uiLog.log('Load bean information from server: ' + _qrCodeId);

    try {
      await this.uiAlert.showLoadingSpinner();
      const beanData: ServerBean =
        await this.serverCommunicationService.getBeanInformation(_qrCodeId);
      await this.uiBeanHelper.addScannedQRBean(beanData);
    } catch (ex) {
      this.uiAnalytics.trackEvent(
        QR_TRACKING.TITLE,
        QR_TRACKING.ACTIONS.SCAN_FAILED
      );
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        'QR.SERVER.ERROR_OCCURED',
        'ERROR_OCCURED',
        undefined,
        true
      );
    }
  }

  public async addBeanFromUser(_userBeanJSON: string) {
    this.uiLog.log(
      'Load bean information from shared user context: ' + _userBeanJSON
    );

    try {
      await this.uiAlert.showLoadingSpinner();

      await this.uiBeanHelper.addUserSharedBean(_userBeanJSON);
    } catch (ex) {
      this.uiAnalytics.trackEvent(
        QR_TRACKING.TITLE,
        QR_TRACKING.ACTIONS.SCAN_FAILED
      );
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        'QR.SERVER.ERROR_OCCURED',
        'ERROR_OCCURED',
        undefined,
        true
      );
    }
  }
}
