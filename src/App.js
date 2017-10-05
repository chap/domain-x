import React, { Component } from 'react';
import axios from 'axios';
import './App.css';
const API_URL = 'https://domain-x-api.herokuapp.com';
// const API_URL = 'http://localhost:4000';
const HTTPStatus = require('http-status');

class App extends Component {
  render() {
    return (
      <DomainInput />
    );
  }
}

class DomainInput extends Component {
  constructor(props) {
    super(props);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.updateDnsInfo = this.updateDnsInfo.bind(this);
    this.updateWhoisInfo = this.updateWhoisInfo.bind(this);
    this.state = {dns:null, whois:null, domain:null};
  }

  handleKeyUp(event) {
    const v = event.target.value;
    if (v !== this.state.domain) {
      if (validDomain(v)) {
        this.setState({domain:v})
        this.updateDnsInfo(v);
        this.updateWhoisInfo(v);
      } else {
        this.setState({dns:null, whois:null, domain:null});
      }
    }
  }

  updateDnsInfo(domain) {
    const dataUrl = API_URL + '/api/?domain=' + domain;
    axios.get(dataUrl)
    .then(response => this.setState({dns: response.data}))
    .catch(function (error) {
      console.log(error);
    })
  }

  updateWhoisInfo(domain) {
    const dataUrl = API_URL + '/api/whois?domain=' + domain;
    axios.get(dataUrl)
    .then(response => this.setState({whois: response.data}))
    .catch(function (error) {
      console.log(error);
    })
  }

  render() {
    let dnsInfo = '';
    if (this.state.dns) {
      dnsInfo = <DnsInfo
        domain={this.state.dns.domain}
        dns_provider={this.state.dns.dns_provider}
        whois={this.state.whois}
        records={this.state.dns.records}
      />;
    }

    return (
      <div className="pa3 flex-auto">
        <input type="text"
               placeholder="domain.com"
               className="flex-auto hk-input w-100"
               onKeyUp={this.handleKeyUp}
               />
        {dnsInfo}
      </div>
    )
  }
}

class DnsInfo extends Component {
  render() {
    let dnsProvider = '';
    let whoisRegistrar = '';
    let records = '';
    let curlButton = '';
    let curlSSLButton = '';
    if(this.props.dns_provider) {
      dnsProvider = <LineItem value={this.props.dns_provider} description="DNS Provider" />;
      curlButton = <RequestButton name="curl" type="curl" domain={this.props.domain} />;
      curlSSLButton = <RequestButton name="curl SSL" type="curl-ssl" domain={this.props.domain} />;
    }
    if(this.props.whois) {
      whoisRegistrar = <LineItem value={this.props.whois.registrar} description="Registrar" />;
    }
    if(this.props.records) {
      records = this.props.records.map(function(record, index){
        if(['NS','MX','SOA','TXT'].includes(record.type)) {
          // skip for now
          return null
        } else {
          return <LineItem value={record.value ? record.value : record.address} raw={record} description={record.type} key={index} />;
        }
      })
    }
    return (
      <div>
        <div className="dt w-100 mb3 hk-hide-bb-last-row">
          {dnsProvider}
          {whoisRegistrar}
          {records}
        </div>
        {curlButton}
        &nbsp;
        {curlSSLButton}
      </div>
    );
  }
}

class LineItem extends Component {
  render() {
    const raw = JSON.stringify(this.props.raw, null, 2);
    let value = this.props.value;
    if(!value) {
      value = <pre>{raw}</pre>;
    }
    return (
      <div className="dt-row w-100 hover hover-bg-lightest-silver">
        <div className="dtc pv3 f4 bb b--light-silver" title={raw}>
          {value}
        </div>
        <div className="dtc pv3 f4 gray bb b--light-silver">
          {this.props.description}
        </div>
      </div>
    )
  }
}

class RequestButton extends Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.state = {domain:props.domain, response:null};
  }

  // not sure why I need this
  componentWillReceiveProps(nextProps) {
    if(nextProps.domain !== this.props.domain) {
      this.setState({domain:nextProps.domain, response:null});
    }
  }

  handleClick() {
    this.setState({response:'...'})
    let path = API_URL+ '/api/curl'
    if(this.props.type === 'curl-ssl') {
      path += '-ssl'
    }
    const dataUrl = path + '?domain=' + this.props.domain;
    axios.get(dataUrl)
    .then(response => this.handleResponse(response.data))
    .catch(function (error) {
      console.log(error);
    })
  }

  handleResponse(data) {
    let response  = "$ curl -I " + data.url + "\n"
    if(data.error) {
       response += "ERROR \n"
       response += JSON.stringify(data.error, null, 2)
    }
    if(data.status) {
       response += data.status + " " + HTTPStatus[data.status] + "\n"
    }
    if(data.location) {
       response += "Location: " + data.location + "\n"
    }
    if(data['content-type']) {
       response += "Content-Type: " + data['content-type'] + "\n"
    }
    if(data.date) {
       response += "Date: " + data.date
    }
    this.setState({response:response, raw:data})
  }

  render() {
    if(!this.state.response) {
      return (
        <button className="hk-button--secondary" onClick={this.handleClick}>
          {this.props.name}
        </button>
      )
    } else {
      return (
        <RequestResponse response={this.state.response} raw={this.state.raw} />
      )
    }
  }
}


class RequestResponse extends Component {
  render() {
    if(this.props.response) {
      return (
        <div className="mb3 has-focus sortable-chosen" title={JSON.stringify(this.props.raw, null, 2)}>
          <div className="bg-light-silver shadow-inner-1 ph3 pv1 br1 tc curlResponse">
            <pre>
              {this.props.response}
            </pre>
          </div>
        </div>
      )
    } else {
      return '';
    }
  }
}

function validDomain(domain) {
  const p = /^(?!:\/\/)([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,20}?$/i
  return domain && domain.search(p) === 0
}

export default App;
