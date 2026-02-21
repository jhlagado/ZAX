; ZAX lowered .asm trace
; range: $0100..$0159 (end exclusive)

; func touch_locals begin
touch_locals:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push HL                        ; 0108: E5
ld HL, $0007                   ; 0109: 21 07 00
ex (SP), HL                    ; 010C: E3
push HL                        ; 010D: E5
ld HL, $1111                   ; 010E: 21 11 11
ex (SP), HL                    ; 0111: E3
push AF                        ; 0112: F5
push BC                        ; 0113: C5
push DE                        ; 0114: D5
push HL                        ; 0115: E5
ld A, (IX-$02)                 ; 0116: DD 7E FE
dec A                          ; 0119: 3D
push AF                        ; 011A: F5
push DE                        ; 011B: D5
push IX                        ; 011C: DD E5
pop HL                         ; 011E: E1
ld DE, $FFFE                   ; 011F: 11 FE FF
add HL, DE                     ; 0122: 19
push HL                        ; 0123: E5
pop DE                         ; 0124: D1
pop AF                         ; 0125: F1
ld (hl), A                     ; 0126: 77
ex DE, HL                      ; 0127: EB
ld E, (IX - $0004)             ; 0128: DD 5E FC
ld D, (IX - $0003)             ; 012B: DD 56 FD
ex DE, HL                      ; 012E: EB
inc HL                         ; 012F: 23
ex DE, HL                      ; 0130: EB
ld (IX - $0004), E             ; 0131: DD 73 FC
ld (IX - $0003), D             ; 0134: DD 72 FD
ex DE, HL                      ; 0137: EB
__zax_epilogue_0:
pop HL                         ; 0138: E1
pop DE                         ; 0139: D1
pop BC                         ; 013A: C1
pop AF                         ; 013B: F1
ld SP, IX                      ; 013C: DD F9
pop IX                         ; 013E: DD E1
ret                            ; 0140: C9
; func main begin
; func touch_locals end
main:
push IX                        ; 0141: DD E5
ld IX, $0000                   ; 0143: DD 21 00 00
add IX, SP                     ; 0147: DD 39
push AF                        ; 0149: F5
push BC                        ; 014A: C5
push DE                        ; 014B: D5
push HL                        ; 014C: E5
call touch_locals              ; 014D: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0150: E1
pop DE                         ; 0151: D1
pop BC                         ; 0152: C1
pop AF                         ; 0153: F1
ld SP, IX                      ; 0154: DD F9
pop IX                         ; 0156: DD E1
ret                            ; 0158: C9
; func main end

; symbols:
; label touch_locals = $0100
; label __zax_epilogue_0 = $0138
; label main = $0141
; label __zax_epilogue_1 = $0150
