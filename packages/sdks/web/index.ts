/* eslint-disable @typescript-eslint/unbound-method */

import type { OpenpanelSdkOptions, PostEventPayload } from '@openpanel/sdk';
import { OpenpanelSdk } from '@openpanel/sdk';

export * from '@openpanel/sdk';

export type OpenpanelOptions = OpenpanelSdkOptions & {
  trackOutgoingLinks?: boolean;
  trackScreenViews?: boolean;
  trackAttributes?: boolean;
  hash?: boolean;
};

function toCamelCase(str: string) {
  return str.replace(/([-_][a-z])/gi, ($1) =>
    $1.toUpperCase().replace('-', '').replace('_', '')
  );
}

export class Openpanel extends OpenpanelSdk<OpenpanelOptions> {
  private lastPath = '';
  private debounceTimer: any;

  constructor(options: OpenpanelOptions) {
    super(options);

    if (!this.isServer()) {
      this.setGlobalProperties({
        __referrer: document.referrer,
      });

      if (this.options.trackOutgoingLinks) {
        this.trackOutgoingLinks();
      }

      if (this.options.trackScreenViews) {
        this.trackScreenViews();
      }

      if (this.options.trackAttributes) {
        this.trackAttributes();
      }
    }
  }

  private debounce(func: () => void, delay: number) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(func, delay);
  }

  private isServer() {
    return typeof document === 'undefined';
  }

  public trackOutgoingLinks() {
    if (this.isServer()) {
      return;
    }

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      if (link && target) {
        const href = link.getAttribute('href');
        if (href?.startsWith('http')) {
          super.event('link_out', {
            href,
            text:
              link.innerText ||
              link.getAttribute('title') ||
              target.getAttribute('alt') ||
              target.getAttribute('title'),
          });
        }
      }
    });
  }

  public trackScreenViews() {
    if (this.isServer()) {
      return;
    }

    const oldPushState = history.pushState;
    history.pushState = function pushState(...args) {
      const ret = oldPushState.apply(this, args);
      window.dispatchEvent(new Event('pushstate'));
      window.dispatchEvent(new Event('locationchange'));
      return ret;
    };

    const oldReplaceState = history.replaceState;
    history.replaceState = function replaceState(...args) {
      const ret = oldReplaceState.apply(this, args);
      window.dispatchEvent(new Event('replacestate'));
      window.dispatchEvent(new Event('locationchange'));
      return ret;
    };

    window.addEventListener('popstate', function () {
      window.dispatchEvent(new Event('locationchange'));
    });

    const eventHandler = () => this.debounce(() => this.screenView(), 50);

    if (this.options.hash) {
      window.addEventListener('hashchange', eventHandler);
    } else {
      window.addEventListener('locationchange', eventHandler);
    }

    // give time for setProfile to be called
    setTimeout(() => eventHandler(), 50);
  }

  public trackAttributes() {
    if (this.isServer()) {
      return;
    }

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const btn = target.closest('button');
      const anchor = target.closest('a');
      const element = btn?.getAttribute('data-event')
        ? btn
        : anchor?.getAttribute('data-event')
          ? anchor
          : null;
      if (element) {
        const properties: Record<string, unknown> = {};
        for (const attr of element.attributes) {
          if (attr.name.startsWith('data-') && attr.name !== 'data-event') {
            properties[toCamelCase(attr.name.replace(/^data-/, ''))] =
              attr.value;
          }
        }
        const name = element.getAttribute('data-event');
        if (name) {
          super.event(name, properties);
        }
      }
    });
  }

  public screenView(properties?: PostEventPayload['properties']): void {
    if (this.isServer()) {
      return;
    }

    const path = window.location.href;

    if (this.lastPath === path) {
      return;
    }

    this.lastPath = path;
    super.event('screen_view', {
      ...(properties ?? {}),
      __path: path,
      __title: document.title,
    });
  }
}
