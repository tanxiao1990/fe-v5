/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Space, Input, Form, Select } from 'antd';
import { LineChartOutlined, PlusOutlined, CloseCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import PageLayout from '@/components/pageLayout';
import { generateID } from '@/utils';
import AdvancedWrap from '@/components/AdvancedWrap';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import { getCommonESClusters, getCommonClusters, getCommonSLSClusters, getCommonCKClusters } from '@/services/common';
import { datasourceCatesMap, DatasourceCateEnum } from '@/utils/constant';
import Elasticsearch from './Elasticsearch';
import Prometheus from './Prometheus';
import AliyunSLS, { setDefaultValues } from './AliyunSLS';
import ClickHouse from './ClickHouse';
import './index.less';
import { useLocation } from 'react-router-dom';

type PanelMeta = { id: string; defaultPromQL?: string };

function getUrlParamsByName(name) {
  let reg = new RegExp(`.*?${name}=([^&]*)`),
    str = location.search || '',
    target = str.match(reg);
  if (target) {
    return target[1];
  }
  return '';
}

const getDefaultDatasourceName = (datasourceCate, datasourceList) => {
  const localPrometheus = localStorage.getItem('curCluster'); // curCluster 是全局的 key name
  const localElasticsearch = localStorage.getItem('datasource_es_name');
  const localAliyunSLS = localStorage.getItem('datasource_aliyunsls_name');
  const localCK = localStorage.getItem('datasource_ck_name');
  if (datasourceCate === 'prometheus') return localPrometheus || _.get(datasourceList, [datasourceCate, 0]);
  if (datasourceCate === 'elasticsearch') return localElasticsearch || _.get(datasourceList, [datasourceCate, 0]);
  if (datasourceCate === 'aliyun-sls') return localAliyunSLS || _.get(datasourceList, [datasourceCate, 0]);
  if (datasourceCate === 'ck') return localCK || _.get(datasourceList, [datasourceCate, 0]);
};

const setDefaultDatasourceName = (datasourceCate, value) => {
  if (datasourceCate === 'prometheus') {
    localStorage.setItem('curCluster', value);
  }
  if (datasourceCate === 'elasticsearch') {
    localStorage.setItem('datasource_es_name', value);
  }
  if (datasourceCate === 'aliyun-sls') {
    localStorage.setItem('datasource_aliyunsls_name', value);
  }
  if (datasourceCate === 'ck') {
    localStorage.setItem('datasource_ck_name', value);
  }
};

const Panel = ({
  defaultPromQL,
  removePanel,
  datasourceList,
  id,
}: {
  id: string;
  datasourceList: {
    prometheus: string[];
    elasticsearch: string[];
    'aliyun-sls': string[];
    ck: string[];
  };
  defaultPromQL: string;
  removePanel: (id: string) => void;
}) => {
  const params = new URLSearchParams(useLocation().search);

  const [form] = Form.useForm();
  const headerExtraRef = useRef<HTMLDivElement>(null);
  const [datasourceCate, setDatasourceCate] = useState(
    params.get('data_source_id') ? DatasourceCateEnum.elasticsearch : localStorage.getItem('datasource_cate') || DatasourceCateEnum.prometheus,
  );

  useEffect(() => {
    localStorage.setItem('datasource_cate', datasourceCate);
    if (datasourceCate === 'aliyun-sls') {
      setDefaultValues(form);
      form.setFieldsValue({ query: { project: params.get('project'), logstore: params.get('logstore'), query: params.get('queryString') } });
    }
  }, [datasourceCate]);

  return (
    <Card bodyStyle={{ padding: 16 }} className='panel'>
      <Form
        form={form}
        initialValues={{
          datasourceCate: datasourceCate,
          datasourceName: params.get('data_source_name') || getDefaultDatasourceName(datasourceCate, datasourceList),
        }}
      >
        <Space align='start'>
          <InputGroupWithFormItem label='数据源类型' labelWidth={84}>
            <AdvancedWrap
              var='VITE_IS_QUERY_ES_DS'
              children={(isES) => {
                return (
                  <Form.Item name='datasourceCate' noStyle>
                    <Select
                      dropdownMatchSelectWidth={false}
                      style={{ minWidth: 70 }}
                      onChange={(val) => {
                        if (typeof val === 'string') {
                          setDatasourceCate(val);
                        }
                        form.setFieldsValue({
                          datasourceName: getDefaultDatasourceName(val, datasourceList),
                        });
                      }}
                    >
                      {_.map(isES ? datasourceCatesMap.all : datasourceCatesMap.normal, (item) => (
                        <Select.Option key={item.value} value={item.value}>
                          {item.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }}
            />
          </InputGroupWithFormItem>
          <Form.Item shouldUpdate={(prev, curr) => prev.datasourceCate !== curr.datasourceCate} noStyle>
            {({ getFieldValue }) => {
              const cate = getFieldValue('datasourceCate');
              return (
                <Input.Group compact>
                  <span
                    className='ant-input-group-addon'
                    style={{
                      width: 'max-content',
                      height: 32,
                      lineHeight: '32px',
                    }}
                  >
                    关联数据源
                  </span>
                  <Form.Item
                    name='datasourceName'
                    rules={[
                      {
                        required: cate !== 'prometheus',
                        message: '请选择数据源',
                      },
                    ]}
                  >
                    <Select
                      placeholder='选择数据源'
                      style={{ minWidth: 70 }}
                      dropdownMatchSelectWidth={false}
                      onChange={(val: string) => {
                        setDefaultDatasourceName(cate, val);
                      }}
                    >
                      {_.map(datasourceList[cate], (item) => (
                        <Select.Option value={item} key={item}>
                          {item}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Input.Group>
              );
            }}
          </Form.Item>
          <div ref={headerExtraRef} />
        </Space>
        <Form.Item shouldUpdate={(prev, curr) => prev.datasourceCate !== curr.datasourceCate || prev.datasourceName !== curr.datasourceName} noStyle>
          {({ getFieldValue }) => {
            const datasourceCate = getFieldValue('datasourceCate');
            const datasourceName = getFieldValue('datasourceName');
            if (datasourceCate === DatasourceCateEnum.prometheus) {
              return <Prometheus defaultPromQL={defaultPromQL} headerExtra={headerExtraRef.current} />;
            } else if (datasourceCate === DatasourceCateEnum.elasticsearch) {
              return <Elasticsearch datasourceName={datasourceName} form={form} />;
            } else if (datasourceCate === DatasourceCateEnum.aliyunSLS) {
              return <AliyunSLS datasourceCate={DatasourceCateEnum.aliyunSLS} datasourceName={datasourceName} headerExtra={headerExtraRef.current} form={form} />;
            } else if (datasourceCate === DatasourceCateEnum.ck) {
              return <ClickHouse datasourceCate={datasourceCate} datasourceName={datasourceName} headerExtra={headerExtraRef.current} form={form} />;
            }
          }}
        </Form.Item>
      </Form>
      <span
        className='remove-panel-btn'
        onClick={() => {
          removePanel(id);
        }}
      >
        <CloseCircleOutlined />
      </span>
    </Card>
  );
};

const PanelList = () => {
  const [panelList, setPanelList] = useState<PanelMeta[]>([{ id: generateID(), defaultPromQL: decodeURIComponent(getUrlParamsByName('promql')) }]);
  const [datasourceList, setDatasourceList] = useState<{
    prometheus: string[];
    elasticsearch: string[];
    'aliyun-sls': string[];
    ck: string[];
  }>({
    prometheus: [],
    elasticsearch: [],
    'aliyun-sls': [],
    ck: [],
  });

  useEffect(() => {
    const fetchDatasourceList = async () => {
      const promList = await getCommonClusters().then((res) => res.dat);
      const esList = await getCommonESClusters().then((res) => res.dat);
      const slsList = await getCommonSLSClusters().then((res) => res.dat);
      const ckList = await getCommonCKClusters().then((res) => res.dat);
      setDatasourceList({
        prometheus: promList,
        elasticsearch: esList,
        'aliyun-sls': slsList,
        ck: ckList,
      });
    };
    fetchDatasourceList().catch(() => {
      setDatasourceList({
        prometheus: [],
        elasticsearch: [],
        'aliyun-sls': [],
        ck: [],
      });
    });
  }, []);

  // 添加一个查询面板
  function addPanel() {
    setPanelList(() => [
      ...panelList,
      {
        id: generateID(),
      },
    ]);
  }

  // 删除指定查询面板
  function removePanel(id) {
    setPanelList(_.filter(panelList, (item) => item.id !== id));
  }

  return (
    <>
      {panelList.map(({ id, defaultPromQL = '' }) => {
        return <Panel key={id} id={id} removePanel={removePanel} defaultPromQL={defaultPromQL} datasourceList={datasourceList} />;
      })}
      <div className='add-prometheus-panel'>
        <Button size='large' onClick={addPanel}>
          <PlusOutlined />
          新增一个查询面板
        </Button>
      </div>
    </>
  );
};

const MetricExplorerPage = () => {
  return (
    <PageLayout title='即时查询' icon={<LineChartOutlined />} hideCluster>
      <div className='prometheus-page'>
        <PanelList />
      </div>
    </PageLayout>
  );
};

export default MetricExplorerPage;
