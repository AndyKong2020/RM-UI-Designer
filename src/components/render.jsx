import React, {Component, createRef} from 'react';
import { Tree, Card, Col, Row, Empty, Dropdown, Modal } from "antd";
import { EllipsisOutlined, CheckOutlined } from '@ant-design/icons'
import { ProDescriptions } from '@ant-design/pro-components';
import { fabric } from 'fabric'
import { getColumnsFromData } from "../utils/columns";
import { Rect } from "../utils/fabricObjects";

class Render extends Component {
    data = {}
    objects = {}
    state = {
        treeData: [],
        properties: null,
        groupKey: 'layer',
        selectedId: -1,
        selectedKey: [],
        uiWindow: {
            height: 1080,
            width: 1920,
            ratio: 1
        },
        rightClickMenuOpen: false,
        modalShow: false
    }
    editable = false;
    canvas = null
    canvasRef = createRef()

    getNewDataId() {
        if (Object.keys(this.data).length === 0) {
            return 0
        }
        return Math.max(...Object.keys(this.data)) + 1
    }

    updateTree() {
        const key = this.state.groupKey
        let treeData = []
        const keys = Object.keys(this.data)
        for (let i = 0; i < keys.length; i++) {
            const node = this.data[keys[i]]

            let pos = -1
            for (let j = 0; j < treeData.length; j++) {
                if (treeData[j].key === `${key}-${node[key]}`) {
                    pos = j
                    break
                }
            }
            if (pos === -1) {
                treeData.push({
                    title: `${key} ${node[key]}`, key: `${key}-${node[key]}`, children: [], isLeaf: false
                })
                pos = treeData.length - 1
            }

            treeData[pos].children.push({
                title: node.name, key: `E-${keys[i]}`
            })
        }

        treeData = treeData.sort((a, b) => a.key.toString().localeCompare(b.key.toString()))
        treeData.unshift({title: "UI Window", key: 'window'})
        this.setState({treeData})
    }

    getNodeFromId(id) {
        if (id[0] === 'E') {
            return id.slice(2)
        }
        return -1
    }

    onSelect(nodes) {
        if (nodes.length === 0) {
            return
        }
        if (nodes[0] === 'window') {
            this.setState({properties: this.state.uiWindow, selectedId: -1, selectedKey: nodes})
            return
        }
        const node = this.getNodeFromId(nodes[0])
        this.select(node)
    }

    select(id) {
        if (id === -1) {
            this.setState({properties: null, selectedId: -1, selectedKey: []})
        } else {
            this.setState({properties: this.data[id], selectedId: id, selectedKey: [`E-${id}`]})
            this.canvas.setActiveObject(this.objects[id])
            this.canvas.renderAll()
        }
    }

    elementsMenuOnClick(key) {
        const first = key.keyPath[key.keyPath.length - 1]
        if (first === 'D1-add') {
            const type = key.key.slice(7)
            const nid = this.getNewDataId()
            if (type === 'rect') {
                let _rect = new Rect({
                    id: nid,
                    name: 'New Rect',
                    layer: 0,
                    groupName: 'Ungroup',
                    ratio: this.state.uiWindow.ratio
                })
                this.objects[nid] = _rect
                this.canvas.add(_rect)
            }
            this.objectsToData()
            this.updateTree()
        } else if (first === 'D1-group') {
            this.setState({groupKey: key.key.slice(9)}, ()=>this.updateTree())
        }
    }

    resetCanvasSize() {
        let width = this.canvasRef.current.clientWidth - 12
        let height = this.canvasRef.current.clientHeight
        let uiWindow = {...this.state.uiWindow}
        if (width / height < uiWindow.width / uiWindow.height) {
            height = width * uiWindow.height / uiWindow.width
            uiWindow.ratio = uiWindow.width / width
        } else {
            width = height * uiWindow.width / uiWindow.height
            uiWindow.ratio = uiWindow.height / height
        }
        this.setState({ uiWindow })
        this.canvas.setHeight(height)
        this.canvas.setWidth(width)
        for (const key of Object.keys(this.objects)) {
            this.objects[key].setRatio(uiWindow.ratio)
        }
        this.canvas.renderAll()
        this.objectsToData()
        this.setState({modalShow: false})
    }

    onReSize() {
        if (!this.state.modalShow) {
            this.canvas.setHeight(10)
            this.canvas.setWidth(10)
            this.canvas.renderAll()
            this.setState({modalShow: true}, () => {
                Modal.info({
                    title: "Reset UI Window Size",
                    content: "Must reset UI window size after resize browser window.",
                    onOk: ()=>this.resetCanvasSize(),
                    okText: 'Reset'
                })
            })
        }
    }

    onPropertiesChange(key, info) {
        if (this.state.selectedKey[0] === 'window') {
            this.setState({uiWindow: info, properties: info}, ()=> {
                this.resetCanvasSize()
            })
        } else if (this.state.selectedId !== -1) {
            this.objects[this.state.selectedId].fromObject(info)
            this.canvas.renderAll()
            this.objectsToData()
            this.updateTree()
        }
    }

    componentDidMount() {
        const that = this
        this.canvas = new fabric.Canvas('ui')
        this.canvas.backgroundColor = '#fff'
        this.resetCanvasSize()
        this.canvas.renderAll()
        this.updateTree()
        window.addEventListener('resize', () => {
            this.onReSize();
        }, false);
        this.canvas.on({
            "mouse:up": () => {
                for (const key of Object.keys(that.objects)) {
                    that.objects[key].resizeScale()
                }
                that.canvas.renderAll()
                that.objectsToData()
                const active = that.canvas.getActiveObject()
                console.log(active)
                if (active) {
                    that.select(active.id)
                } else {
                    that.select(-1)
                }
            }
        })
    }

    objectsToData() {
        this.data = {}
        for (const key of Object.keys(this.objects)) {
            const info = this.objects[key].toObject()
            this.data[info.id] = info
        }
        if (this.state.selectedId !== -1) {
            this.setState({
                properties: this.data[this.state.selectedId]
            })
        }
    }

    onElementRightClick(e) {
        if (e.node.key[0] === 'E') {
            this.select(e.node.key.slice(2))
        } else {
            this.select(-1)
        }
    }

    onElementMenuClick(e) {
        this.setState({rightClickMenuOpen: false})
        console.log(e)
    }

    onMenuOpenChange(e) {
        if (e) {
            const that = this
            setTimeout(()=>{
                if (that.state.selectedId !== -1) {
                    that.setState({rightClickMenuOpen: true})
                } else {
                    that.setState({rightClickMenuOpen: false})
                }
            }, 100)
        } else {
            this.setState({rightClickMenuOpen: false})
        }
    }

    onElementMenuContainerClick(e) {
        if (e.target.localName === 'div') {
            this.setState({rightClickMenuOpen: false, properties: null, selectedId: -1, selectedKey: []})
        }
    }

    render() {
        let groupPos = 0
        const items = [
            {
                key: 'D1-group',
                label: "Group by",
                children: [
                    {key: 'D1-group-layer', label: 'layer'},
                    {key: 'D1-group-group', label: 'group'}
                ]
            }
        ];
        if (this.props.editable) {
            items.unshift({
                key: 'D1-add',
                label: "Add Element",
                children: [
                    {key: 'D1-add-rect', label: 'Rect'}
                ]
            })
            groupPos++;
        }
        for (let i = 0; i < items[groupPos].children.length; i++) {
            if (items[groupPos].children[i].label === this.state.groupKey) {
                items[groupPos].children[i].icon = <CheckOutlined />
            }
        }

        return (
            <div className="full">
                <Row warp={false} className="container" gutter={12}>
                    <Col flex="300px">
                        <div style={{height: "50%", paddingBottom: 12}}>
                            <Card
                                size="small"
                                title="Elements"
                                style={{height: "100%"}}
                                extra={
                                    <Dropdown menu={{ items, onClick: (e)=>this.elementsMenuOnClick(e) }}>
                                        <EllipsisOutlined />
                                    </Dropdown>
                                }
                            >
                                <div
                                    className="card-body"
                                    onMouseUp={(e)=>this.onElementMenuContainerClick(e)}
                                >
                                    <Dropdown
                                        menu={{
                                            items: [
                                                {key: 'D2-copy', label: 'Copy'},
                                                {key: 'D2-delete', label: 'Delete', danger: true}
                                            ],
                                            onClick: (e)=>{this.onElementMenuClick(e)}
                                        }}
                                        trigger={['contextMenu']}
                                        open={this.state.rightClickMenuOpen}
                                        onOpenChange={(e)=>{this.onMenuOpenChange(e)}}
                                    >
                                        <Tree
                                            className="full"
                                            treeData={this.state.treeData}
                                            onSelect={(e)=>this.onSelect(e)}
                                            selectedKeys={this.state.selectedKey}
                                            onRightClick={(e)=>this.onElementRightClick(e)}
                                            defaultExpandParent={true}
                                        />
                                    </Dropdown>
                                </div>
                            </Card>
                        </div>
                        <Card size="small" title="Properties" style={{height: "50%"}}>
                            <div className="card-body">
                                {
                                    this.state.properties ?
                                        <ProDescriptions
                                            dataSource={this.state.properties}
                                            columns={getColumnsFromData(this.state.properties)}
                                            editable={
                                                this.props.editable ?
                                                {onSave: (key, info)=>this.onPropertiesChange(key, info)}:
                                                null
                                            }
                                            column={1}
                                            style={{marginTop: 4}}
                                        /> :
                                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                }
                            </div>
                        </Card>
                    </Col>
                    <Col flex="auto" ref={this.canvasRef}>
                        <canvas className="full" id="ui" />
                    </Col>
                </Row>
            </div>
        );
    }
}

export default Render;