; ZAX lowered .asm trace
; range: $0100..$018B (end exclusive)

; func add_words begin
add_words:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ex DE, HL                      ; 0112: EB
ld E, (IX + $0006)             ; 0113: DD 5E 06
ld D, (IX + $0007)             ; 0116: DD 56 07
add HL, DE                     ; 0119: 19
__zax_epilogue_0:
pop DE                         ; 011A: D1
pop BC                         ; 011B: C1
pop AF                         ; 011C: F1
ld SP, IX                      ; 011D: DD F9
pop IX                         ; 011F: DD E1
ret                            ; 0121: C9
; func add_words end
; func bump_byte begin
bump_byte:
push IX                        ; 0122: DD E5
ld IX, $0000                   ; 0124: DD 21 00 00
add IX, SP                     ; 0128: DD 39
ld HL, $0000                   ; 012A: 21 00 00
push HL                        ; 012D: E5
push AF                        ; 012E: F5
push BC                        ; 012F: C5
push DE                        ; 0130: D5
ex de, hl                      ; 0131: EB
ld e, (IX+$04)                 ; 0132: DD 5E 04
ex de, hl                      ; 0135: EB
ld H, $0000                    ; 0136: 26 00
inc L                          ; 0138: 2C
ex DE, HL                      ; 0139: EB
ld (IX - $0002), E             ; 013A: DD 73 FE
ld (IX - $0001), D             ; 013D: DD 72 FF
ex DE, HL                      ; 0140: EB
ex DE, HL                      ; 0141: EB
ld E, (IX - $0002)             ; 0142: DD 5E FE
ld D, (IX - $0001)             ; 0145: DD 56 FF
ex DE, HL                      ; 0148: EB
__zax_epilogue_1:
pop DE                         ; 0149: D1
pop BC                         ; 014A: C1
pop AF                         ; 014B: F1
ld SP, IX                      ; 014C: DD F9
pop IX                         ; 014E: DD E1
ret                            ; 0150: C9
; func bump_byte end
; func main begin
main:
push IX                        ; 0151: DD E5
ld IX, $0000                   ; 0153: DD 21 00 00
add IX, SP                     ; 0157: DD 39
push HL                        ; 0159: E5
ld HL, $0000                   ; 015A: 21 00 00
ex (SP), HL                    ; 015D: E3
push AF                        ; 015E: F5
push BC                        ; 015F: C5
push DE                        ; 0160: D5
push HL                        ; 0161: E5
ld HL, $0014                   ; 0162: 21 14 00
push HL                        ; 0165: E5
ld HL, $000A                   ; 0166: 21 0A 00
push HL                        ; 0169: E5
call add_words                 ; 016A: CD 00 00
inc SP                         ; 016D: 33
inc SP                         ; 016E: 33
inc SP                         ; 016F: 33
inc SP                         ; 0170: 33
ex DE, HL                      ; 0171: EB
ld (IX - $0002), E             ; 0172: DD 73 FE
ld (IX - $0001), D             ; 0175: DD 72 FF
ex DE, HL                      ; 0178: EB
ld HL, $0007                   ; 0179: 21 07 00
push HL                        ; 017C: E5
call bump_byte                 ; 017D: CD 00 00
inc SP                         ; 0180: 33
inc SP                         ; 0181: 33
__zax_epilogue_2:
pop HL                         ; 0182: E1
pop DE                         ; 0183: D1
pop BC                         ; 0184: C1
pop AF                         ; 0185: F1
ld SP, IX                      ; 0186: DD F9
pop IX                         ; 0188: DD E1
ret                            ; 018A: C9
; func main end

; symbols:
; label add_words = $0100
; label __zax_epilogue_0 = $011A
; label bump_byte = $0122
; label __zax_epilogue_1 = $0149
; label main = $0151
; label __zax_epilogue_2 = $0182
