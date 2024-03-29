import * as tarhon from 'https://unpkg.com/tarhon?module';

/**
* This is WIP implementation according to my understanding of provided design and tarhon library.
* It lacks many features, but should be still good as a test task results.
* I didn't found a way to re-render DOM in tarhon (I guess that's because the library has different purpose) so
* it manipulates DOM directly, what is more efficient but not that convenient way.
*/
export class MultiSelect extends tarhon.observeComponent(HTMLElement) {
  static get selector() {
    return 'multi-select';
  }

  // parameters
  #options = [];
  #label = 'Select values';
  #placeholder = 'Placeholder';
  #selected = [];
  #required = false;
  #disabled = false;
  #helpTip = 'Help or instruction text goes here';

  // pre-selected nodes
  #containerNode = null;
  #optionsContainerNode = null;
  #menuNode = null;

  /**
   * TODO: I see that if I provide a list of my properties, they will be wrapped into observable objects and put into
   * this.attrs. However, I don't know how to subscribe on the updates or what approach to use with it.
   */
  static get observedAttributes(){
      return [];
  }

  // TODO: is there a way to add some autocomplete feature or highlight errors?
  static style = tarhon.styled({
    ':host': {
      'font-family': 'Roboto',
      'position': 'relative',
      'width': '100%',
      'display': 'flex',
      'flex-direction': 'column',
      'align-items': 'stretch',
      'background': '#fff'
    },
    'dom-repeat': {
      'max-width': '100%'
    },
    '.clickable': {
      'cursor': 'pointer',
      'user-select': 'none'
    },
    '.disabled .clickable': {
      'cursor': 'initial'
    },
    'label': {
      'font-size': '16px',
      'font-weight': 600,
      'color': '#1F2937',
      'display': 'block',
      'margin-bottom': '5px'
    },
    'label .asterisk': {
      'visibility': 'hidden',
      'color': '#DC2626'
    },
    '.required label .asterisk': {
      'visibility': 'visible'
    },
    '.selector': {
      'display': 'flex',
      'width': '100%',
      'box-sizing': 'border-box',
      'min-width': '100px',
      'border': '1px solid #6B7280',
      'border-radius': '5px',
      'padding': '7px'
    },
    '.open .selector': {
      'border-bottom-right-radius': 0,
      'border-bottom-left-radius': 0,
    },
    '.disabled .selector': {
      'background-color': '#F3F4F6'
    },
    '.no-options.required .selector': {
      'border-color': '#DC2626'
    },
    '.options-container': {
      'display': 'flex',
      'flex-wrap': 'wrap',
      'gap': '5px',
      'max-width': 'calc(100% - 45px)',
    },
    '.placeholder': {
      'color': '#9CA3AF',
      'font-size': '14px',
      'line-height': '23px',
      'font-weight': 400
    },
    '.placeholder:not(:only-child)': {
      'display': 'none'
    },
    '.controls-container': {
      'display': 'flex',
      'gap': '5px',
      'height': '23px',
      'flex-basis': '45px',
      'flex-shrink': 0,
      'margin-left': 'auto',
      'align-items': 'center',
      'justify-content': 'flex-end'
    },
    '.no-options .clear-all, .disabled .clear-all': {
      'display': 'none'
    },
    '.open .controls-container .chevron': {
      'transform': 'rotate(180deg)'
    },
    '.menu': {
      'display': 'none',
      'position': 'absolute',
      'z-index': 2,
      'background': '#fff',
      'width': '100%',
      'box-sizing': 'border-box',
      'border': '1px solid #6B7280',
      'border-radius': '5px',
      'border-top': 'none',
      'border-top-right-radius': 0,
      'border-top-left-radius': 0,
      'padding': '7px',
      'margin': 0,
      'list-style': 'none'
    },
    '.menu li': {
      'overflow': 'hidden',
      'text-overflow': 'ellipsis',
    },
    '.menu li:empty': {
      'display': 'none'
    },
    '.option': {
      'display': 'inline-flex',
      'max-width': '100%',
      'align-items': 'center',
      'border-radius': '3px',
      'padding': '2px 4px',
      'color': '#374151',
      'text-overflow': 'ellipsis'
    },
    '.option .text': {
      'flex': 1,
      'white-space': 'nowrap',
      'overflow': 'hidden',
      'text-overflow': 'ellipsis',
    },
    '.option .clear-option': {
      'margin-left': 'auto',
    },
    '.menu .option': {
      'margin-top': '5px',
    },
    '.menu .option .clear-option': {
      'display': 'none',
    },
    '.open .menu': {
      'display': 'flex'
    },
    '.help-tip': {
      'font-size': '12px',
      'font-weight': 400,
      'line-height': '15px',
      'color': '#6B7280'
    },
    '.required.no-options .help-tip': {
      'color': '#B91C1C'
    }
  });

  constructor() {
    super();

    this.#placeholder = this.getAttribute('placeholder');
    this.#label = this.getAttribute('label') || this.#label;
    this.#disabled = this.getAttribute('disabled');
    this.#required = this.getAttribute('required');
    this.#helpTip = this.getAttribute('help-tip') || this.#helpTip;


    // assume that options are provided as a child template
    this.querySelector('template').content.querySelectorAll('option').forEach((optionNode) => {
      let colorValue
      if (!this.#disabled) {
        colorValue = optionNode.getAttribute('color');
        if (!CSS.supports('color', colorValue)) colorValue = '#E5E7EB';
      } else {
        colorValue = '#E5E7EB';
      }

      this.#options.push({
        color: colorValue,
        text: optionNode.text,
        value: optionNode.getAttribute('value')
      });
    });


    this.render();

    // grab references to key nodes for more convenience
    this.#containerNode = this.renderRoot.querySelector('.container');
    this.#optionsContainerNode = this.renderRoot.querySelector('.options-container');
    this.#menuNode = this.renderRoot.querySelector('.menu');

    // subscribe on click outside
    document.addEventListener('click', this.#onClickOutside);

    // preselect options
    const rawSelectedProp = this.getAttribute('selected');
    if (rawSelectedProp) {
      const selectedValues = rawSelectedProp.split(',');
      selectedValues.filter((val) => this.#options.findIndex((opt) => opt.value === val) !== -1)
                    .forEach((optionValue) => this.#selectOption(optionValue));
    }

    if (this.#required) this.#containerNode.classList.add('required');
    if (this.#disabled) this.#containerNode.classList.add('disabled');

    this.#refreshNoOptionsClass();
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.#onClickOutside);
  }

  get allOptionsSelected() {
    return this.#options.length === this.#selected.length;
  }

  #onClickOutside = (event) => {
    if (this.contains(event.target)) return;

    this.#closeMenu();
  }

  #toggleMenu = () => {
    if (this.#disabled || this.allOptionsSelected) return;

    this.#containerNode.classList.toggle('open');
  };

  #closeMenu = () => {
    this.#containerNode.classList.remove('open');
  };

  #selectOption = (optionValue) => {
    const option = this.#menuNode.querySelector(`.option[data-value="${optionValue}"]`);
    this.#optionsContainerNode.appendChild(option);
    this.#selected.push(optionValue);
    console.log('selected', this.#selected.length, this.#selected);
    if (this.allOptionsSelected) this.#closeMenu();
    this.#refreshNoOptionsClass();

    // TODO: propagate updated values outside
  };

  #removeOption = (optionValue, event = null) => {
    if (this.#disabled) return;

    event?.stopPropagation();
    // restore original option position in menu
    const option = this.#optionsContainerNode.querySelector(`.option[data-value="${optionValue}"]`);
    const item = this.#menuNode.querySelector(`li[data-value="${optionValue}"]`);
    item.appendChild(option);

    const index = this.#selected.indexOf(optionValue);
    this.#selected.splice(index, 1);

    this.#refreshNoOptionsClass();
    // TODO: propagate updated values outside
  };

  #removeAllOptions = (event) => {
    event.stopPropagation();
    [...this.#selected].forEach((optionValue) => this.#removeOption(optionValue));
  }

  #refreshNoOptionsClass = () => {
    if (this.#selected.length === 0) {
      this.#containerNode.classList.add('no-options');
    } else {
      this.#containerNode.classList.remove('no-options');
    }
  }

  #renderLabel() {
    return tarhon.html`
      <label>
        ${this.#label}
        <span class="asterisk">*<span>
      </label>
    `;
  }

  render() {
    super.render();

    const menuOptions = this.#options.map((opt, i) => {
      const styleString = `background: ${opt.color}`;
      return tarhon.html`
        <li class="clickable" data-value="${opt.value}" @click="${() => this.#selectOption(opt.value)}">
          <span class="option" data-value="${opt.value}" style="${styleString}">
            <span class="text">${opt.text}</span>
            <svg class="clear-option" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
                 @click="${(event) => this.#removeOption(opt.value, event)}">
              <path d="M10.5625 10.3125C10.7969 10.5234 10.7969 10.875 10.5625 11.0859C10.3516 11.3203 10 11.3203 9.78906 11.0859L7 8.29688L4.1875 11.0859C3.97656 11.3203 3.625 11.3203 3.41406 11.0859C3.17969 10.875 3.17969 10.5234 3.41406 10.3125L6.20312 7.5L3.41406 4.71094C3.17969 4.5 3.17969 4.14844 3.41406 3.9375C3.625 3.70312 3.97656 3.70312 4.1875 3.9375L7 6.72656L9.78906 3.9375C10 3.70312 10.3516 3.70312 10.5625 3.9375C10.7969 4.14844 10.7969 4.5 10.5625 4.71094L7.77344 7.5L10.5625 10.3125Z" fill="#4B5563"/>
            </svg>
          </span>
        <li>
      `;
    });

    this.renderRoot.appendChild(tarhon.html`
      <main class="container">
        ${this.#label ? this.#renderLabel() : null}
        <div class="selector clickable" @click="${this.#toggleMenu}">
          <div class="options-container">
            <span class="placeholder">${this.#placeholder}</span>
          </div>
          <div class="controls-container">
            <svg class="clear-all" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
                 @click="${this.#removeAllOptions}">
              <path d="M7 0C10.85 0 14 3.15 14 7C14 10.8792 10.85 14 7 14C3.12083 14 0 10.8792 0 7C0 3.15 3.12083 0 7 0ZM9.33333 8.4L7.9625 7L9.33333 5.62917C9.625 5.36667 9.625 4.92917 9.33333 4.66667C9.07083 4.375 8.63333 4.375 8.37083 4.66667L7 6.0375L5.6 4.66667C5.3375 4.375 4.9 4.375 4.6375 4.66667C4.34583 4.92917 4.34583 5.36667 4.6375 5.62917L6.00833 7L4.6375 8.4C4.34583 8.6625 4.34583 9.1 4.6375 9.3625C4.9 9.65417 5.3375 9.65417 5.6 9.3625L7 7.99167L8.37083 9.3625C8.63333 9.65417 9.07083 9.65417 9.33333 9.3625C9.625 9.1 9.625 8.6625 9.33333 8.4Z" fill="#9CA3AF"/>
            </svg>

            <svg class="chevron" width="13" height="8" viewBox="0 0 13 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.9359 0.842436C11.7445 0.623483 11.4437 0.514006 11.1702 0.514006C10.8968 0.514006 10.6234 0.596113 10.4046 0.815067L6.13899 4.89308L1.84602 0.815067C1.40852 0.37716 0.72493 0.404529 0.314773 0.842436C-0.122727 1.28034 -0.0953829 1.96457 0.342117 2.37511L5.37337 7.1921C5.78352 7.60263 6.46712 7.60263 6.87727 7.1921L11.9085 2.37511C12.346 1.96457 12.3734 1.28034 11.9359 0.842436Z" fill="#9CA3AF"/>
            </svg>
          </div>
        </div>
        <ul class="menu">
          ${menuOptions}
        </ul>
        <span class="help-tip">${this.#helpTip ?? ''}</span>
      </main>
    `);
  }
}

// Define the new element
customElements.define(MultiSelect.selector, MultiSelect);
