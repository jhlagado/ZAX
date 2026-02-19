; ZAX lowered .asm trace
; range: $0100..$0156 (end exclusive)

; func read_counter begin
read_counter:
push AF                        ; 0100: F5
push BC                        ; 0101: C5
push DE                        ; 0102: D5
ld HL, (counter)               ; 0103: 2A 00 00
__zax_epilogue_0:
pop DE                         ; 0106: D1
pop BC                         ; 0107: C1
pop AF                         ; 0108: F1
ret                            ; 0109: C9
; func read_counter end
; func write_counter begin
write_counter:
push IX                        ; 010A: DD E5
ld IX, $0000                   ; 010C: DD 21 00 00
add IX, SP                     ; 0110: DD 39
push HL                        ; 0112: E5
push DE                        ; 0113: D5
push BC                        ; 0114: C5
push AF                        ; 0115: F5
push DE                        ; 0116: D5
push IX                        ; 0117: DD E5
pop HL                         ; 0119: E1
ld DE, $0004                   ; 011A: 11 04 00
add HL, DE                     ; 011D: 19
push HL                        ; 011E: E5
pop DE                         ; 011F: D1
ld a, (hl) ; inc hl ; ld h, (hl) ; ld l, a ; 0120: 7E 23 66 6F
push HL                        ; 0124: E5
ld HL, counter                 ; 0125: 21 00 00
pop DE                         ; 0128: D1
ld (hl), e ; inc hl ; ld (hl), d ; 0129: 73 23 72
__zax_epilogue_1:
pop AF                         ; 012C: F1
pop BC                         ; 012D: C1
pop DE                         ; 012E: D1
pop HL                         ; 012F: E1
ld SP, IX                      ; 0130: DD F9
pop IX                         ; 0132: DD E1
ret                            ; 0134: C9
; func main begin
; func write_counter end
main:
push IX                        ; 0135: DD E5
ld IX, $0000                   ; 0137: DD 21 00 00
add IX, SP                     ; 013B: DD 39
push HL                        ; 013D: E5
push DE                        ; 013E: D5
push BC                        ; 013F: C5
push AF                        ; 0140: F5
ld HL, $007B                   ; 0141: 21 7B 00
push HL                        ; 0144: E5
call write_counter             ; 0145: CD 00 00
inc SP                         ; 0148: 33
inc SP                         ; 0149: 33
ld HL, (counter)               ; 014A: 2A 00 00
__zax_epilogue_2:
pop AF                         ; 014D: F1
pop BC                         ; 014E: C1
pop DE                         ; 014F: D1
pop HL                         ; 0150: E1
ld SP, IX                      ; 0151: DD F9
pop IX                         ; 0153: DD E1
ret                            ; 0155: C9
; func main end

; symbols:
; label read_counter = $0100
; label __zax_epilogue_0 = $0106
; label write_counter = $010A
; label __zax_epilogue_1 = $012C
; label main = $0135
; label __zax_epilogue_2 = $014D
; var counter = $0156
