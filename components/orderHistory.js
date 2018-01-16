const React = require('react');
const ReactDOM = require('react-dom');

module.exports = OrdersHistory;

class OrdersHistory extends React.Component {
    render() {
        var headers = [];
        var data = this.props.data;
        data.forEach(row => Object.getOwnPropertyNames(row).forEach(header => headers.push(header)));
        return {
            <table>
                <tr>{headers.map(header => { <th>header</th> })}</tr>
                {data.map(row => {
                    <tr>
                        {Object.getOwnPropertyNames(row).sort((name1, name2) => headers.indexOf(name1) < headers.indexOf(name2)).map(rowPropertyName => { <td>{row[rowPropertyName]}</td> })}
                    </tr>
                })}
            </table>
        }
    }
}
