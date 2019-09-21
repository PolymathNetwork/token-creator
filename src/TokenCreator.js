import React, { useContext, useEffect, useState, Fragment } from 'react'
import { Store } from './index'
import { Form, Input, Button, Divider, Select, Switch, Typography, Row, Col, message } from 'antd'
import useForm from 'rc-form-hooks'
import { filter } from 'p-iteration'
import { utils as web3Utils } from 'web3'

const { Option } = Select
const { Item } = Form
const { Title, Paragraph } = Typography

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
  },
}

export const reducer = (state, action) => {
  console.log('ACTION', action)
  switch (action.type) {
  case 'FETCHING_RESERVATIONS':
    return {
      ...state,
      loading: true,
      loadingMessage: 'Fetching your previously reserved symbols',
      error: undefined,
    }
  case 'RESERVING_SYMBOL':
    return {
      ...state,
      loading: true,
      loadingMessage: 'Reserving symbol'
    }
  case 'RESERVED_SYMBOL':
    return {
      ...state,
      loading: true,
      reservations: undefined,
      loadingMessage: 'Refreshing reservations',
    }
  case 'CREATING_TOKEN':
    return {
      ...state,
      loading: true,
      loadingMessage: 'Creating token'
    }
  case 'CREATED_TOKEN':
    return {
      ...state,
      loading: true,
      reservations: undefined,
      loadingMessage: 'Refreshing reservations',
    }
  case 'FETCHED_RESERVATIONS':
    const { reservations } = action
    return {
      ...state,
      loading: false,
      loadingMessage: '',
      error: undefined,
      reservations
    }
  default:
    throw new Error(`Unrecognized action type: ${action.type}`)
  }
}

export default function TokenCreator() {
  const [state, dispatch] = useContext(Store)

  console.log(state)

  const { sdk, walletAddress } = state.App
  const { reservations } = state.TokenCreator
  const [ formSymbolValue, setFormSymbolValue ] = useState('')

  const form = useForm()
  const { getFieldDecorator, resetFields, validateFields } = form

  // Fetch previous reservations if any.
  useEffect(() => {
    async function fetchReservations() {
      dispatch({ type: 'FETCHING_RESERVATIONS' })
      try {
        let reservations = await sdk.getSecurityTokenReservations({owner: walletAddress })
        reservations = await filter(reservations, async (reservation) => {
          const launched = await reservation.isLaunched()
          return !launched
        })
        dispatch({type: 'FETCHED_RESERVATIONS', reservations})
      } catch (error) {
        dispatch({type: 'ERROR', error: error.message})
      }
    }
    if (sdk && walletAddress && reservations === undefined) {
      fetchReservations()
    }
    // eslint-disable-next-line
  }, [reservations, sdk, walletAddress])

  async function reserveSymbol() {
    if (formSymbolValue) {
      dispatch({type: 'RESERVING_SYMBOL'})
      try {
        const q = await sdk.reserveSecurityToken({symbol: formSymbolValue})
        const ret = await q.run()
        dispatch({type: 'RESERVED_SYMBOL'})
        message.success(`Symbol ${formSymbolValue} has been reserved successfully!`)
      } catch (error) {
        dispatch({type: 'ERROR', error: error.message})
      }
    } else {
      message.error('Please provide a symbol')
    }
  }

  async function createToken(e) {
    e.preventDefault()
    const fields = ['symbol', 'name', 'detailsUrl', 'treasuryWallet', 'divisible']
    validateFields(fields, { force: true })
      .then(async (values) => {
        dispatch({type: 'CREATING_TOKEN'})
        const reservation = reservations.filter(r => r.symbol === values.symbol)[0]

        try {
          const q = await reservation.createSecurityToken(values)
          const ret = await q.run()
          dispatch({ type: 'CREATED_TOKEN'})
          message.success(`Token ${reservation.symbol} has been created successfully!`)
          resetFields()
        }
        catch (error) {
          dispatch({ type: 'ERROR',
            error: error.message} )
        }
      })
  }

  return (
    <Fragment>
      <Form colon={false} style={{maxWidth: 600}} {...formItemLayout}>
        <Title level={2} style={{margin: 25}}>Reserve Your Token Symbol</Title>
        <Paragraph style={{margin: 25}}>Reservation ensures that no other organization can create a token symbol identical to yours using the Polymath platform. This operation carries a cost of: 250 POLY.</Paragraph>
        <Item name="symbol"
          label="Symbol">
          <Input
            placeholder="SYMBOL"
            value={formSymbolValue}
            onChange={({ target: { value }}) => {
              const pattern = RegExp('^[a-zA-Z0-9_-]*$')
              if (pattern.test(value) && value.length <= 10) {
                setFormSymbolValue(value.toUpperCase())
              }
            }}
          />
        </Item>
        <Button type="primary" style={{width: '100%'}} onClick={reserveSymbol}>Reserve Symbol</Button>
      </Form>

      <Divider />

      {reservations &&
      <Form colon={false} style={{maxWidth: 600}} {...formItemLayout}
        onSubmit={createToken}>
        <Title level={2} style={{margin: 25}}>Create Your Security Token</Title>
        <Paragraph style={{margin: 25}}>Create your security token using one of your previous symbol reservations. If you let your token reservation expire, the token symbol you selected will be available for others to claim.</Paragraph>
        <Item
          style={{textAlign: 'left', marginBottom: 25}}
          name="symbol"
          label="Reservation">
          {getFieldDecorator('symbol', {
            rules: [{required: true, message: 'A token reservation is required'}],
          })(<Select
            placeholder="Select a reservation">
            {reservations.map(({symbol}) =>
              <Option key={symbol} value={symbol}>{symbol}</Option> )}
          </Select>)}
        </Item>
        <Item
          style={{textAlign: 'left', marginBottom: 25}}
          name="name"
          label="Token Name"
          extra="This is the name of your token for display purposes. For example: Toro Token">
          {getFieldDecorator('name', {
            rules: [{required: true, message: 'Token name is required'}, {max: 64}],
          })(<Input placeholder="Enter Token Name"/>)}
        </Item>
        <Item
          style={{textAlign: 'left', marginBottom: 25}}
          name="detailsUrl"
          label="Token Details"
          extra="Paste a link to a web page that includes additional information on your token, such as legend.">
          {getFieldDecorator('detailsUrl', {initialValue: ''})(<Input placeholder="Paste link here"/>)}
        </Item>
        <Item
          style={{textAlign: 'left', marginBottom: 25}}
          name="treasuryWallet"
          label="Treasury Wallet Address"
          extra="Address of a wallet to be used to store tokens for some operations. Defaults to current user (eg Token Issuer) address">
          {getFieldDecorator('treasuryWallet', {initialValue: walletAddress,
            rules: [
              { required: true  },
              {
                validator: (rule, value, callback) => {
                  if (!web3Utils.isAddress(value)) {
                    callback('Address is invalid')
                    return
                  }
                  callback()
                  return
                }
              }
            ] })(<Input />)}
        </Item>
        <Item
          style={{textAlign: 'left', marginBottom: 25}}
          name="divisible"
          label="Divisible"
          extra="Indivisible tokens are typically used to represent an equity, while divisible tokens may be used to represent divisible assets such as bonds. Please connect with your advisor to select the best option..">
          {getFieldDecorator('divisible', {
            initialValue: false,
            valuePropName: 'checked',
          })(<Switch style={{float: 'left'}} />)}
        </Item>

        <div style={{width: '100%'}}>
          <Row gutter={16}>
            <Col span={12}><Button style={{width: '100%'}} htmlType="reset" onClick={() => resetFields()}>
            Reset fields
            </Button></Col>
            <Col span={12}> <Button type="primary" style={{width: '100%'}} htmlType="submit">
              Create my token
            </Button></Col>
          </Row>
        </div>
      </Form>
      }
    </Fragment>
  )
}