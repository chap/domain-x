import React, { Component } from 'react';
import axios from 'axios';
import './App.css';

const API_HOST = process.env.API_HOST ||'http://localhost:4000'
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
    this.state = {};
  }

  handleKeyUp(event) {
    const v = event.target.value;
    if (validDomain(v)) {
      this.updateDnsInfo(v);
    } else {
      const b = {};
      this.setState(b);
    }
  }

  updateDnsInfo(domain) {
    const dataUrl = API_HOST + '?domain=' + domain;
    axios.get(dataUrl)
    .then(response => this.setState(response.data))
    .catch(function (error) {
      console.log(error);
    })
  }

  render() {
    let dnsInfo = '';
    if (this.state.domain) {
      dnsInfo = <DnsInfo domain={this.state.domain} dns_provider={this.state.dns_provider} records={this.state.records} />;
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
    let infoTable = '';
    let records = '';
    if(this.props.dns_provider) {
      infoTable = <LineItem value={this.props.dns_provider} description="DNS Provider" />;
    }
    if(this.props.records) {
      records = this.props.records.map(function(record){
        if(['NS','MX','SOA','TXT'].includes(record.type)) {
          // skip for now
          return null
        } else {
          return <LineItem value={record.value ? record.value : record.address} raw={record} description={record.type} />;
        }
      })
    }
    return (
      <div>
        <div className="dt w-100 mb3 hk-hide-bb-last-row">
          {infoTable}
          {records}
        </div>
        <RequestButton name="curl" type="curl" domain={this.props.domain} />
        &nbsp;
        <RequestButton name="curl SSL" type="curl-ssl" domain={this.props.domain} />
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
    this.state = {result:null};
  }

  handleClick() {
    this.setState({response:'...'})
    let path = '/curl'
    if(this.props.type === 'curl-ssl') {
      path = '/curl-ssl'
    }
    const dataUrl = API_HOST + path + '?domain=' + this.props.domain;
    axios.get(dataUrl)
    .then(response => this.handleResponse(response.data))
    .catch(function (error) {
      console.log(error);
    })
  }

  handleResponse(data) {
    let response  = "$ curl -I " + data.url + "\n"
    if(data.error) {
       response += "ERROR \N"
       response += JSON.stringify(data.error, null, 2)
    }
    if(data.status) {
       response += data.status + " " + HTTPStatus[data.status] + "\n"
    }
    if(data.location) {
       response += "Location: " + data.location + "\n"
    }
    if(data['content-type']) {
       response += "Content-Length: " + data['content-type'] + "\n"
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
  constructor(props) {
    super(props);
    this.state = {visibility:'hide'};
  }

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
